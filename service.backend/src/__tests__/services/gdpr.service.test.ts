import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Response } from 'express';
import sequelize from '../../sequelize';
import Application, { ApplicationStatus } from '../../models/Application';
import ApplicationStatusTransition from '../../models/ApplicationStatusTransition';
import AuditLog from '../../models/AuditLog';
import DeviceToken from '../../models/DeviceToken';
import Message from '../../models/Message';
import Notification from '../../models/Notification';
import Pet from '../../models/Pet';
import RefreshToken from '../../models/RefreshToken';
import Rescue from '../../models/Rescue';
import StaffMember from '../../models/StaffMember';
import User, { UserStatus, UserType } from '../../models/User';
import UserConsent, { ConsentPurpose } from '../../models/UserConsent';
import { FileUploadService } from '../../services/file-upload.service';
import GdprService from '../../services/gdpr.service';

// Mock FileUploadService.deleteFile so the anonymization tests don't try
// to touch the real storage layer. The behavioural assertion is that
// deleteFile is invoked once per attachment after the DB tx commits.
vi.mock('../../services/file-upload.service', () => ({
  FileUploadService: {
    deleteFile: vi.fn().mockResolvedValue({ success: true, message: 'deleted' }),
  },
}));

const seedUser = async (overrides: Record<string, unknown> = {}) =>
  User.create({
    email: `user-${Date.now()}-${Math.random()}@example.com`,
    password: 'password123',
    firstName: 'Jane',
    lastName: 'Doe',
    phoneNumber: '07123456789',
    bio: 'Loves dogs',
    addressLine1: '1 Example St',
    city: 'London',
    country: 'GB',
    postalCode: 'EC1A 1BB',
    status: UserStatus.ACTIVE,
    userType: UserType.ADOPTER,
    emailVerified: true,
    loginAttempts: 0,
    ...overrides,
  });

const seedRescue = async (overrides: Record<string, unknown> = {}) => {
  // Cast through unknown because the test schema's Rescue.create() typing
  // requires every nullable column at the TS level even though the DB
  // accepts the partial. Same pattern used in
  // ApplicationStatusTransition.test.ts.
  const payload: Record<string, unknown> = {
    name: `Test Rescue ${Date.now()}-${Math.random()}`,
    email: `rescue-${Date.now()}-${Math.random()}@example.com`,
    address: '1 Lane',
    city: 'London',
    postcode: 'AB1 2CD',
    country: 'GB',
    contactPerson: 'Jane',
    status: 'verified',
    ...overrides,
  };
  return Rescue.create(payload as never);
};

// Raw inserts skip Pet's array-typed columns (SQLite ↔ Postgres mismatch),
// same workaround as ApplicationStatusTransition.test.ts.
const seedPet = async (rescueId: string, overrides: Record<string, unknown> = {}) => {
  const petId = `${Date.now().toString(16)}-2222-4222-a222-${Math.random()
    .toString(16)
    .slice(2, 14)
    .padEnd(12, '0')}`;
  await sequelize.getQueryInterface().bulkInsert('pets', [
    {
      pet_id: petId,
      name: `TestPet-${petId.slice(0, 8)}`,
      rescue_id: rescueId,
      type: 'dog',
      status: 'available',
      gender: 'male',
      age_group: 'adult',
      adoption_fee_minor: 0,
      adoption_fee_currency: 'GBP',
      archived: false,
      featured: false,
      priority_listing: false,
      special_needs: false,
      house_trained: false,
      view_count: 0,
      favorite_count: 0,
      application_count: 0,
      tags: '[]',
      created_at: new Date(),
      updated_at: new Date(),
      version: 0,
      ...overrides,
    },
  ]);
  const pet = await Pet.findByPk(petId);
  if (!pet) throw new Error('failed to seed pet');
  return pet;
};

const seedApplication = async (
  userId: string,
  petId: string,
  rescueId: string,
  status: ApplicationStatus = ApplicationStatus.SUBMITTED
) => {
  const applicationId = `${Date.now().toString(16)}-3333-4333-a333-${Math.random()
    .toString(16)
    .slice(2, 14)
    .padEnd(12, '0')}`;
  await sequelize.getQueryInterface().bulkInsert('applications', [
    {
      application_id: applicationId,
      user_id: userId,
      pet_id: petId,
      rescue_id: rescueId,
      status,
      priority: 'normal',
      stage: 'pending',
      documents: '[]',
      tags: '[]',
      created_at: new Date(),
      updated_at: new Date(),
      version: 0,
    },
  ]);
  const app = await Application.findByPk(applicationId);
  if (!app) throw new Error('failed to seed application');
  return app;
};

describe('GdprService', () => {
  beforeEach(() => {
    vi.mocked(FileUploadService.deleteFile).mockClear();
    vi.mocked(FileUploadService.deleteFile).mockResolvedValue({
      success: true,
      message: 'deleted',
    });
  });

  describe('requestErasure (phase 1)', () => {
    it('soft-deletes the user, stamps pending_anonymization_at, revokes sessions, and clears device tokens — without scrubbing PII', async () => {
      const user = await seedUser();
      await RefreshToken.create({
        user_id: user.userId,
        family_id: `family-${user.userId}`,
        token_hash: `hash-${user.userId}`,
        expires_at: new Date(Date.now() + 86400000),
        is_revoked: false,
      } as never);
      await DeviceToken.create({
        user_id: user.userId,
        device_token: `device-${user.userId}`,
        platform: 'web',
        status: 'active',
      } as never);

      const before = Date.now();
      const result = await GdprService.requestErasure(user.userId, { actorUserId: user.userId });
      const after = Date.now();

      expect(result.userId).toBe(user.userId);
      expect(result.refreshTokensRevoked).toBe(1);
      expect(result.deviceTokensCleared).toBe(1);
      expect(result.pendingAnonymizationAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.pendingAnonymizationAt.getTime()).toBeLessThanOrEqual(after);

      const reloaded = await User.scope('withSecrets').findByPk(user.userId, { paranoid: false });
      expect(reloaded).not.toBeNull();
      // Soft-deleted with the grace marker stamped.
      expect(reloaded!.deletedAt).not.toBeNull();
      expect(reloaded!.pendingAnonymizationAt).not.toBeNull();
      expect(reloaded!.status).toBe(UserStatus.DEACTIVATED);
      // PII INTENTIONALLY PRESERVED for the grace window — support
      // tooling must be able to identify the account to cancel the
      // erasure if it was triggered accidentally.
      expect(reloaded!.email).toBe(user.email);
      expect(reloaded!.firstName).toBe('Jane');
      expect(reloaded!.lastName).toBe('Doe');
      expect(reloaded!.phoneNumber).toBe('07123456789');
      expect(reloaded!.addressLine1).toBe('1 Example St');

      // Sessions and device tokens gone.
      const remainingTokens = await RefreshToken.findAll({ where: { user_id: user.userId } });
      expect(remainingTokens).toHaveLength(0);
      const remainingDevices = await DeviceToken.findAll({ where: { user_id: user.userId } });
      expect(remainingDevices).toHaveLength(0);
    });

    it('writes an audit row attributed to the actor', async () => {
      const user = await seedUser();
      const admin = await seedUser({ userType: UserType.ADMIN });

      await GdprService.requestErasure(user.userId, {
        actorUserId: admin.userId,
        reason: 'support request',
      });

      const auditRows = await AuditLog.findAll({ where: { action: 'USER_ERASURE_REQUESTED' } });
      expect(auditRows).toHaveLength(1);
      const metadata = auditRows[0].metadata as Record<string, unknown>;
      expect(metadata.entityId).toBe(user.userId);
      const details = metadata.details as Record<string, unknown>;
      expect(details.actorUserId).toBe(admin.userId);
      expect(details.reason).toBe('support request');
      expect(details.graceDays).toBe(30);
    });

    it('throws when the user does not exist', async () => {
      await expect(
        GdprService.requestErasure('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow('User not found');
    });
  });

  describe('executeAnonymization (phase 2)', () => {
    it('scrubs PII, rewrites sender messages, clears 2FA + tokens, and randomises the password', async () => {
      const user = await seedUser({
        twoFactorEnabled: true,
        twoFactorSecret: 'totpsecret123',
      });

      // Seed a chat + message authored by the user so the scrub can be observed.
      const rescue = await seedRescue();
      const chatId = `${Date.now().toString(16)}-1111-4111-a111-${Math.random()
        .toString(16)
        .slice(2, 14)
        .padEnd(12, '0')}`;
      await sequelize.getQueryInterface().bulkInsert('chats', [
        {
          chat_id: chatId,
          rescue_id: rescue.rescueId,
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);
      const messageId = `${Date.now().toString(16)}-7777-4777-a777-${Math.random()
        .toString(16)
        .slice(2, 14)
        .padEnd(12, '0')}`;
      await sequelize.getQueryInterface().bulkInsert('messages', [
        {
          message_id: messageId,
          chat_id: chatId,
          sender_id: user.userId,
          content: 'This is my real message content',
          content_format: 'plain',
          sequence: 0,
          attachments: '[]',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      // Phase 1 first so phase 2 has something to operate on.
      await GdprService.requestErasure(user.userId, { actorUserId: user.userId });

      const result = await GdprService.executeAnonymization(user.userId);
      expect(result.anonymized).toBe(true);

      const reloaded = await User.scope('withSecrets').findByPk(user.userId, { paranoid: false });
      expect(reloaded).not.toBeNull();
      expect(reloaded!.email).toMatch(/@redacted\.local$/);
      expect(reloaded!.firstName).toBe('Deleted');
      expect(reloaded!.lastName).toBe('User');
      expect(reloaded!.phoneNumber).toBeNull();
      expect(reloaded!.bio).toBeNull();
      expect(reloaded!.addressLine1).toBeNull();
      expect(reloaded!.postalCode).toBeNull();
      expect(reloaded!.twoFactorSecret).toBeNull();
      expect(reloaded!.twoFactorEnabled).toBe(false);
      expect(reloaded!.backupCodes).toBeNull();
      // Password is overwritten with random bytes before the beforeUpdate
      // hook re-hashes it; the row therefore never carries the user's
      // original plaintext or hash. (We can't assert "differs from before"
      // because the test bcrypt mock returns a constant.)
      expect(typeof reloaded!.password).toBe('string');
      expect(reloaded!.password.length).toBeGreaterThan(0);
      // Phase 1 marker cleared; row remains soft-deleted.
      expect(reloaded!.pendingAnonymizationAt).toBeNull();
      expect(reloaded!.deletedAt).not.toBeNull();

      // Sender-scoped message bodies replaced with the tombstone.
      const reloadedMessage = await Message.findByPk(messageId);
      expect(reloadedMessage).not.toBeNull();
      expect(reloadedMessage!.content).toBe('[message removed at user request]');
    });

    it('scrubs user_email_snapshot from prior audit-log rows to honour GDPR Art. 17', async () => {
      const user = await seedUser();
      // Seed an audit row that captures the original email snapshot, as
      // any historical action would have done.
      await AuditLog.create({
        service: 'test',
        action: 'USER_VIEWED',
        entity: 'User',
        entityId: user.userId,
        level: 'INFO',
        user: user.userId,
        user_email_snapshot: user.email,
      } as never);

      const before = await AuditLog.findOne({
        where: { user: user.userId, action: 'USER_VIEWED' },
      });
      expect(before).not.toBeNull();
      expect(before!.user_email_snapshot).toBe(user.email);

      await GdprService.requestErasure(user.userId);
      await GdprService.executeAnonymization(user.userId);

      // Snapshot column wiped on every audit row referencing this user.
      const after = await AuditLog.findOne({
        where: { user: user.userId, action: 'USER_VIEWED' },
      });
      expect(after).not.toBeNull();
      expect(after!.user_email_snapshot).toBeNull();
      // The FK link itself is preserved so forensics still resolve.
      expect(after!.user).toBe(user.userId);
    });

    it('is idempotent — second run returns anonymized:false and does not write another audit row', async () => {
      const user = await seedUser();
      await GdprService.requestErasure(user.userId);
      await GdprService.executeAnonymization(user.userId);
      const auditCountBefore = await AuditLog.count({ where: { action: 'USER_ANONYMIZED' } });

      const second = await GdprService.executeAnonymization(user.userId);
      expect(second.anonymized).toBe(false);

      const auditCountAfter = await AuditLog.count({ where: { action: 'USER_ANONYMIZED' } });
      expect(auditCountAfter).toBe(auditCountBefore);
    });

    it('throws when the user does not exist', async () => {
      await expect(
        GdprService.executeAnonymization('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow('User not found');
    });

    it('deletes physical attachment files for every message authored by the user', async () => {
      const user = await seedUser();
      const rescue = await seedRescue();
      const chatId = `${Date.now().toString(16)}-1111-4111-a111-${Math.random()
        .toString(16)
        .slice(2, 14)
        .padEnd(12, '0')}`;
      await sequelize.getQueryInterface().bulkInsert('chats', [
        {
          chat_id: chatId,
          rescue_id: rescue.rescueId,
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      const attachmentA = {
        attachment_id: 'upload-aaa-111',
        filename: 'photo1.jpg',
        originalName: 'photo1.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
        url: '/uploads/chat/photo1.jpg',
      };
      const attachmentB = {
        attachment_id: 'upload-bbb-222',
        filename: 'photo2.jpg',
        originalName: 'photo2.jpg',
        mimeType: 'image/jpeg',
        size: 2048,
        url: '/uploads/chat/photo2.jpg',
      };
      const attachmentC = {
        attachment_id: 'upload-ccc-333',
        filename: 'doc.pdf',
        originalName: 'doc.pdf',
        mimeType: 'application/pdf',
        size: 4096,
        url: '/uploads/chat/doc.pdf',
      };

      const buildMessage = (suffix: string, attachments: (typeof attachmentA)[]) => ({
        message_id: `${Date.now().toString(16)}-${suffix}-4${suffix}-a${suffix}-${Math.random()
          .toString(16)
          .slice(2, 14)
          .padEnd(12, '0')}`,
        chat_id: chatId,
        sender_id: user.userId,
        content: `msg ${suffix}`,
        content_format: 'plain',
        attachments: JSON.stringify(attachments),
        created_at: new Date(),
        updated_at: new Date(),
      });

      await sequelize
        .getQueryInterface()
        .bulkInsert('messages', [
          buildMessage('7777', [attachmentA, attachmentB]),
          buildMessage('8888', [attachmentC]),
        ]);

      await GdprService.requestErasure(user.userId, { actorUserId: user.userId });
      const result = await GdprService.executeAnonymization(user.userId);
      expect(result.anonymized).toBe(true);

      // Attachments JSON column scrubbed.
      const reloadedMessages = await Message.findAll({ where: { sender_id: user.userId } });
      expect(reloadedMessages).toHaveLength(2);
      for (const msg of reloadedMessages) {
        expect(msg.attachments).toEqual([]);
        expect(msg.content).toBe('[message removed at user request]');
      }

      // Physical file deletion invoked once per attachment, with the
      // admin-typed system actor so the ownership check is bypassed.
      const deleteCalls = vi.mocked(FileUploadService.deleteFile).mock.calls;
      const deletedAttachmentIds = deleteCalls.map(call => call[0]);
      expect(deletedAttachmentIds.sort()).toEqual(
        ['upload-aaa-111', 'upload-bbb-222', 'upload-ccc-333'].sort()
      );
      for (const call of deleteCalls) {
        expect(call[1]).toEqual({ id: user.userId, type: UserType.ADMIN });
      }
    });

    it('continues anonymization even if individual attachment deletions fail', async () => {
      const user = await seedUser();
      const rescue = await seedRescue();
      const chatId = `${Date.now().toString(16)}-2222-4222-a222-${Math.random()
        .toString(16)
        .slice(2, 14)
        .padEnd(12, '0')}`;
      await sequelize.getQueryInterface().bulkInsert('chats', [
        {
          chat_id: chatId,
          rescue_id: rescue.rescueId,
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);
      const messageId = `${Date.now().toString(16)}-9999-4999-a999-${Math.random()
        .toString(16)
        .slice(2, 14)
        .padEnd(12, '0')}`;
      await sequelize.getQueryInterface().bulkInsert('messages', [
        {
          message_id: messageId,
          chat_id: chatId,
          sender_id: user.userId,
          content: 'msg',
          content_format: 'plain',
          sequence: 0,
          attachments: JSON.stringify([
            {
              attachment_id: 'missing-file-1',
              filename: 'a.jpg',
              originalName: 'a.jpg',
              mimeType: 'image/jpeg',
              size: 1,
              url: '/x',
            },
            {
              attachment_id: 'ok-file-2',
              filename: 'b.jpg',
              originalName: 'b.jpg',
              mimeType: 'image/jpeg',
              size: 1,
              url: '/y',
            },
          ]),
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      vi.mocked(FileUploadService.deleteFile).mockImplementation(async (uploadId: string) => {
        if (uploadId === 'missing-file-1') {
          throw new Error('Upload record not found');
        }
        return { success: true, message: 'deleted' };
      });

      await GdprService.requestErasure(user.userId, { actorUserId: user.userId });
      const result = await GdprService.executeAnonymization(user.userId);
      expect(result.anonymized).toBe(true);

      // Both deletions attempted despite the first throwing.
      expect(vi.mocked(FileUploadService.deleteFile)).toHaveBeenCalledTimes(2);

      // DB state still scrubbed.
      const reloaded = await Message.findByPk(messageId);
      expect(reloaded!.attachments).toEqual([]);
    });
  });

  describe('cancelErasure', () => {
    it('restores a user inside the grace window — clearing the marker and un-soft-deleting', async () => {
      const user = await seedUser();
      const admin = await seedUser({ userType: UserType.ADMIN });
      await GdprService.requestErasure(user.userId, { actorUserId: user.userId });

      const result = await GdprService.cancelErasure(user.userId, { userId: admin.userId });
      expect(result.userId).toBe(user.userId);

      const reloaded = await User.findByPk(user.userId, { paranoid: false });
      expect(reloaded).not.toBeNull();
      expect(reloaded!.pendingAnonymizationAt).toBeNull();
      expect(reloaded!.deletedAt).toBeNull();
      expect(reloaded!.status).toBe(UserStatus.ACTIVE);

      const auditRows = await AuditLog.findAll({ where: { action: 'USER_ERASURE_CANCELLED' } });
      expect(auditRows).toHaveLength(1);
      const metadata = auditRows[0].metadata as Record<string, unknown>;
      expect(metadata.entityId).toBe(user.userId);
    });

    it('refuses to cancel once phase-2 anonymization has completed', async () => {
      const user = await seedUser();
      const admin = await seedUser({ userType: UserType.ADMIN });
      await GdprService.requestErasure(user.userId);
      await GdprService.executeAnonymization(user.userId);

      await expect(
        GdprService.cancelErasure(user.userId, { userId: admin.userId })
      ).rejects.toThrow('User already anonymized — cannot cancel erasure');
    });
  });

  describe('consent', () => {
    it('records grant and withdrawal as separate rows', async () => {
      const user = await seedUser();

      await GdprService.recordConsent({
        userId: user.userId,
        purpose: ConsentPurpose.MARKETING_EMAIL,
        granted: true,
        policyVersion: '1.0.0',
      });
      await GdprService.recordConsent({
        userId: user.userId,
        purpose: ConsentPurpose.MARKETING_EMAIL,
        granted: false,
        policyVersion: '1.0.0',
      });

      const rows = await UserConsent.findAll({ where: { userId: user.userId } });
      expect(rows).toHaveLength(2);

      const current = await GdprService.getCurrentConsents(user.userId);
      expect(current[ConsentPurpose.MARKETING_EMAIL]).toBe(false);
    });

    it('returns the latest decision per purpose', async () => {
      const user = await seedUser();

      await GdprService.recordConsent({
        userId: user.userId,
        purpose: ConsentPurpose.ANALYTICS,
        granted: true,
        policyVersion: '1.0.0',
      });

      const current = await GdprService.getCurrentConsents(user.userId);
      expect(current[ConsentPurpose.ANALYTICS]).toBe(true);
      expect(current[ConsentPurpose.MARKETING_EMAIL]).toBeUndefined();
    });
  });

  describe('exportUserData', () => {
    it('returns the user record without password / secrets', async () => {
      const user = await seedUser();
      await GdprService.recordConsent({
        userId: user.userId,
        purpose: ConsentPurpose.MARKETING_EMAIL,
        granted: true,
        policyVersion: '1.0.0',
      });

      const data = await GdprService.exportUserData(user.userId);

      expect(data.user).toBeDefined();
      const exportedUser = data.user as Record<string, unknown>;
      expect(exportedUser.password).toBeUndefined();
      expect(exportedUser.twoFactorSecret).toBeUndefined();
      expect(exportedUser.email).toBe(user.email);
      expect(Array.isArray(data.consents)).toBe(true);
      expect((data.consents as unknown[]).length).toBe(1);
    });

    it('throws when the user does not exist', async () => {
      await expect(
        GdprService.exportUserData('00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow('User not found');
    });
  });

  describe('eraseRescue', () => {
    it('archives pets, rejects pending applications, downgrades staff, and notifies applicants', async () => {
      const rescue = await seedRescue();
      const rescueId = rescue.rescueId;

      // Sequential seeding — SQLite is single-writer and nested
      // findOrCreate transactions in the Rescue afterCreate hook can
      // collide when fired in parallel.
      const pet1 = await seedPet(rescueId);
      const pet2 = await seedPet(rescueId);
      await seedPet(rescueId);

      const applicant1 = await seedUser();
      const applicant2 = await seedUser();
      const staff1 = await seedUser({ userType: UserType.RESCUE_STAFF });
      const staff2 = await seedUser({ userType: UserType.RESCUE_STAFF });
      const actor = await seedUser({ userType: UserType.ADMIN });

      await seedApplication(applicant1.userId, pet1.petId, rescueId);
      await seedApplication(applicant2.userId, pet2.petId, rescueId);
      await StaffMember.create({
        rescueId,
        userId: staff1.userId,
        isVerified: true,
        addedBy: actor.userId,
        addedAt: new Date(),
      });
      await StaffMember.create({
        rescueId,
        userId: staff2.userId,
        isVerified: true,
        addedBy: actor.userId,
        addedAt: new Date(),
      });

      const result = await GdprService.eraseRescue(rescueId, { actorUserId: actor.userId });

      expect(result.petsArchived).toBe(3);
      expect(result.applicationsRejected).toBe(2);
      expect(result.staffDowngraded).toBe(2);
      expect(result.alreadyArchived).toBe(false);

      // Rescue row anonymised, soft-deleted, and flipped to inactive.
      const reloadedRescue = await Rescue.findByPk(rescueId, { paranoid: false });
      expect(reloadedRescue).not.toBeNull();
      expect(reloadedRescue!.name).toContain('Deleted Rescue');
      expect(reloadedRescue!.email).toMatch(/^deleted-rescue-.+@redacted\.local$/);
      expect(reloadedRescue!.contactPerson).toBe('Deleted');
      expect(reloadedRescue!.status).toBe('inactive');
      expect(reloadedRescue!.deletedAt).not.toBeNull();

      // All owned pets archived.
      const pets = await Pet.findAll({ where: { rescueId } });
      expect(pets).toHaveLength(3);
      expect(pets.every(p => p.archived)).toBe(true);

      // Pending applications rejected with the expected reason.
      const apps = await Application.findAll({ where: { rescueId } });
      expect(apps).toHaveLength(2);
      expect(apps.every(a => a.status === ApplicationStatus.REJECTED)).toBe(true);
      expect(apps.every(a => a.rejectionReason === 'Rescue account deleted')).toBe(true);

      // A transition row was written for each rejected application.
      const transitions = await ApplicationStatusTransition.findAll({
        where: { toStatus: ApplicationStatus.REJECTED },
      });
      expect(transitions).toHaveLength(2);
      expect(transitions.every(t => t.reason === 'Rescue account deleted')).toBe(true);

      // Staff members soft-deleted (default scope hides them).
      const remainingStaff = await StaffMember.findAll({ where: { rescueId } });
      expect(remainingStaff).toHaveLength(0);
      // User accounts untouched.
      const staffUsers = await User.findAll({
        where: { userId: [staff1.userId, staff2.userId] },
      });
      expect(staffUsers).toHaveLength(2);

      // Applicants got an in-app notification.
      const notifications = await Notification.findAll({
        where: { user_id: [applicant1.userId, applicant2.userId] },
      });
      expect(notifications).toHaveLength(2);
      expect(notifications.every(n => n.type === 'application_status')).toBe(true);

      // Aggregate audit log row captures the operation. The audit_log
      // table stores entity/entityId/details inside the metadata JSON
      // column (see AuditLogService.log).
      const auditRows = await AuditLog.findAll({ where: { action: 'GDPR_RESCUE_ERASE' } });
      expect(auditRows).toHaveLength(1);
      const metadata = auditRows[0].metadata as Record<string, unknown>;
      expect(metadata.entityId).toBe(rescueId);
      const details = metadata.details as Record<string, unknown>;
      expect(details.petsArchived).toBe(3);
      expect(details.applicationsRejected).toBe(2);
      expect(details.staffDowngraded).toBe(2);
    });

    it('throws when the rescue does not exist', async () => {
      await expect(GdprService.eraseRescue('00000000-0000-0000-0000-000000000000')).rejects.toThrow(
        'Rescue not found'
      );
    });

    it('rejects callers who are neither platform admin nor an admin of the target rescue', async () => {
      const { default: GdprController } = await import('../../controllers/gdpr.controller');
      const rescue = await seedRescue();
      const outsider = await seedUser({
        userType: UserType.RESCUE_STAFF,
        rescueId: '00000000-0000-0000-0000-000000000000',
      });

      const statusFn = vi.fn().mockReturnThis();
      const jsonFn = vi.fn();
      // express-validator/req types — we only set the fields the controller reads.
      const reqShape: Record<string, unknown> = {
        params: { rescueId: rescue.rescueId },
        body: {},
        user: { ...outsider.toJSON(), rescueId: outsider.rescueId },
      };
      const resShape: Record<string, unknown> = { status: statusFn, json: jsonFn };
      // The controller is shape-typed against AuthenticatedRequest /
      // Response; this cast is the test-only equivalent of constructing
      // a partial mock.
      await GdprController.eraseRescue(
        reqShape as unknown as Parameters<typeof GdprController.eraseRescue>[0],
        resShape as unknown as Response
      );

      expect(statusFn).toHaveBeenCalledWith(403);
      // Rescue is untouched.
      const stillThere = await Rescue.findByPk(rescue.rescueId);
      expect(stillThere?.name).toBe(rescue.name);
    });

    it('serializes overlapping erase attempts so the second observes already-archived state', async () => {
      // SQLite is single-writer in tests; we exercise the serialization
      // contract by issuing two back-to-back calls and asserting:
      //   1. both succeed without throwing,
      //   2. the second sees alreadyArchived = true (the lock-and-check
      //      established by the row lock means the second cannot
      //      re-run the destructive steps),
      //   3. counts on the second run are zero (no double-rejection,
      //      no double-archive).
      const rescue = await seedRescue();
      const rescueId = rescue.rescueId;
      const actor = await seedUser({ userType: UserType.ADMIN });

      const r1 = await GdprService.eraseRescue(rescueId, { actorUserId: actor.userId });
      const r2 = await GdprService.eraseRescue(rescueId, { actorUserId: actor.userId });

      expect(r1.alreadyArchived).toBe(false);
      expect(r2.alreadyArchived).toBe(true);
      expect(r2.petsArchived).toBe(0);
      expect(r2.applicationsRejected).toBe(0);
      expect(r2.staffDowngraded).toBe(0);
    });
  });

  // Previously cleared `authToken` — a cookie name that's never set —
  // leaving the real `accessToken`/`refreshToken` cookies intact and the
  // session resumable until access-token expiry. The fix must clear both
  // real cookies with the same options used at set time.
  describe('eraseSelf — auth cookie clearing', () => {
    it('clears accessToken and refreshToken with matching options', async () => {
      const { default: GdprController } = await import('../../controllers/gdpr.controller');
      const user = await seedUser();

      const clearCookieFn = vi.fn();
      const statusFn = vi.fn().mockReturnThis();
      const jsonFn = vi.fn();
      const reqShape: Record<string, unknown> = {
        body: {},
        user: { ...user.toJSON() },
      };
      const resShape: Record<string, unknown> = {
        clearCookie: clearCookieFn,
        status: statusFn,
        json: jsonFn,
      };

      await GdprController.eraseSelf(
        reqShape as unknown as Parameters<typeof GdprController.eraseSelf>[0],
        resShape as unknown as Response
      );

      expect(clearCookieFn).toHaveBeenCalledWith(
        'accessToken',
        expect.objectContaining({ httpOnly: true, sameSite: 'strict' })
      );
      expect(clearCookieFn).toHaveBeenCalledWith(
        'refreshToken',
        expect.objectContaining({ httpOnly: true, sameSite: 'strict' })
      );
      // Nothing should be cleared with the bogus `authToken` name.
      expect(clearCookieFn).not.toHaveBeenCalledWith('authToken', expect.anything());
      expect(clearCookieFn).not.toHaveBeenCalledWith('authToken');
    });
  });
});
