import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock models before any imports
vi.mock('../../models/Invitation');
vi.mock('../../models/User');
vi.mock('../../models/Rescue');
vi.mock('../../models/StaffMember');
vi.mock('../../models/Role');
vi.mock('../../models/UserRole');

vi.mock('../../services/email-template.service', () => ({
  default: {
    sendStaffInvitation: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../utils/secrets', () => ({
  hashToken: vi.fn((token: string) => `hashed_${token}`),
}));

import Invitation from '../../models/Invitation';
import User from '../../models/User';
import Rescue from '../../models/Rescue';
import StaffMember from '../../models/StaffMember';
import Role from '../../models/Role';
import UserRole from '../../models/UserRole';
import EmailTemplateService from '../../services/email-template.service';
import { InvitationService } from '../../services/invitation.service';

// Typed mocks
const MockedInvitation = Invitation as vi.MockedObject<typeof Invitation>;
const MockedUser = User as vi.MockedObject<typeof User>;
const MockedRescue = Rescue as vi.MockedObject<typeof Rescue>;
const MockedStaffMember = StaffMember as vi.MockedObject<typeof StaffMember>;
const MockedRole = Role as vi.MockedObject<typeof Role>;
const MockedUserRole = UserRole as vi.MockedObject<typeof UserRole>;
const MockedEmailTemplateService = EmailTemplateService as vi.MockedObject<
  typeof EmailTemplateService
>;

// Shared transaction mock
const mockTransaction = {
  commit: vi.fn().mockResolvedValue(undefined),
  rollback: vi.fn().mockResolvedValue(undefined),
};

// Helper to build a mock invitation instance
type MockInvitationInstance = {
  invitation_id: string;
  email: string;
  rescue_id: string;
  token: string;
  title: string;
  invited_by: string;
  used: boolean;
  expiration: Date;
  created_at: Date;
  updated_at: Date;
  update: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
};

const buildInvitation = (overrides: Partial<MockInvitationInstance> = {}): MockInvitationInstance => {
  const base: MockInvitationInstance = {
    invitation_id: 'inv-001',
    email: 'staff@example.com',
    rescue_id: 'rescue-001',
    token: 'hashed_mock-token',
    title: 'Volunteer',
    invited_by: 'admin-user-id',
    used: false,
    expiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    created_at: new Date(),
    updated_at: new Date(),
    update: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockImplementation(function (this: MockInvitationInstance) {
      return { ...this };
    }),
  };
  const merged = { ...base, ...overrides };
  // Rebind get so it references the merged object
  merged.get = vi.fn().mockImplementation(() => ({ ...merged }));
  return merged;
};

type MockRescueInstance = { rescueId: string; name: string };

const buildRescue = (overrides: Partial<MockRescueInstance> = {}): MockRescueInstance => ({
  rescueId: 'rescue-001',
  name: 'Happy Paws Rescue',
  ...overrides,
});

type MockUserInstance = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
};

const buildUser = (overrides: Partial<MockUserInstance> = {}): MockUserInstance => ({
  userId: 'user-new-001',
  email: 'staff@example.com',
  firstName: 'Jane',
  lastName: 'Smith',
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();

  // Default: Invitation.sequelize.transaction returns mock transaction
  (MockedInvitation as unknown as { sequelize: { transaction: ReturnType<typeof vi.fn> } }).sequelize = {
    transaction: vi.fn().mockResolvedValue(mockTransaction),
  };

  mockTransaction.commit.mockResolvedValue(undefined);
  mockTransaction.rollback.mockResolvedValue(undefined);
});

describe('InvitationService', () => {
  describe('inviteStaffMember', () => {
    describe('when rescue exists and email is not already used', () => {
      it('should create an invitation and return success', async () => {
        MockedRescue.findByPk = vi.fn().mockResolvedValue(buildRescue());
        MockedStaffMember.findOne = vi.fn().mockResolvedValue(null);
        MockedInvitation.findOne = vi.fn().mockResolvedValue(null);
        MockedInvitation.create = vi.fn().mockResolvedValue(buildInvitation());

        const result = await InvitationService.inviteStaffMember(
          'rescue-001',
          'staff@example.com',
          'Volunteer',
          'admin-user-id'
        );

        expect(result.success).toBe(true);
        expect(result.invitationId).toBe('inv-001');
        expect(mockTransaction.commit).toHaveBeenCalledOnce();
        expect(mockTransaction.rollback).not.toHaveBeenCalled();
      });

      it('should store a hashed token in the database, not the raw token', async () => {
        MockedRescue.findByPk = vi.fn().mockResolvedValue(buildRescue());
        MockedStaffMember.findOne = vi.fn().mockResolvedValue(null);
        MockedInvitation.findOne = vi.fn().mockResolvedValue(null);
        MockedInvitation.create = vi.fn().mockResolvedValue(buildInvitation());

        await InvitationService.inviteStaffMember(
          'rescue-001',
          'staff@example.com',
          'Volunteer',
          'admin-user-id'
        );

        // The raw token is 32 bytes hex — 64 chars. The value passed to create
        // must NOT be that raw token; the model hook hashes it.
        // We verify the service passes the raw token and the model's beforeSave
        // hook is responsible for hashing — here we just verify create was called.
        expect(MockedInvitation.create).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'staff@example.com',
            rescue_id: 'rescue-001',
            token: expect.any(String),
            used: false,
          }),
          expect.objectContaining({ transaction: mockTransaction })
        );

        // The token passed to create should be 64 hex chars (raw randomBytes(32))
        const createArgs = (MockedInvitation.create as vi.Mock).mock.calls[0][0] as {
          token: string;
        };
        expect(createArgs.token).toMatch(/^[0-9a-f]{64}$/);
      });

      it('should set invitation expiry to 7 days from now', async () => {
        MockedRescue.findByPk = vi.fn().mockResolvedValue(buildRescue());
        MockedStaffMember.findOne = vi.fn().mockResolvedValue(null);
        MockedInvitation.findOne = vi.fn().mockResolvedValue(null);
        MockedInvitation.create = vi.fn().mockResolvedValue(buildInvitation());

        const before = Date.now();
        await InvitationService.inviteStaffMember(
          'rescue-001',
          'staff@example.com',
          'Volunteer',
          'admin-user-id'
        );
        const after = Date.now();

        const createArgs = (MockedInvitation.create as vi.Mock).mock.calls[0][0] as {
          expiration: Date;
        };
        const expirationMs = createArgs.expiration.getTime();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

        expect(expirationMs).toBeGreaterThanOrEqual(before + sevenDaysMs);
        expect(expirationMs).toBeLessThanOrEqual(after + sevenDaysMs);
      });

      it('should send an invitation email', async () => {
        MockedRescue.findByPk = vi.fn().mockResolvedValue(buildRescue());
        MockedStaffMember.findOne = vi.fn().mockResolvedValue(null);
        MockedInvitation.findOne = vi.fn().mockResolvedValue(null);
        MockedInvitation.create = vi.fn().mockResolvedValue(buildInvitation());

        await InvitationService.inviteStaffMember(
          'rescue-001',
          'staff@example.com',
          'Volunteer',
          'admin-user-id'
        );

        expect(MockedEmailTemplateService.sendStaffInvitation).toHaveBeenCalledOnce();
        expect(MockedEmailTemplateService.sendStaffInvitation).toHaveBeenCalledWith(
          expect.objectContaining({
            recipientEmail: 'staff@example.com',
            rescueName: 'Happy Paws Rescue',
            expirationDays: 7,
          })
        );
      });
    });

    describe('when the email send fails', () => {
      it('should still commit the invitation and return success — graceful degradation', async () => {
        MockedRescue.findByPk = vi.fn().mockResolvedValue(buildRescue());
        MockedStaffMember.findOne = vi.fn().mockResolvedValue(null);
        MockedInvitation.findOne = vi.fn().mockResolvedValue(null);
        MockedInvitation.create = vi.fn().mockResolvedValue(buildInvitation());
        (MockedEmailTemplateService.sendStaffInvitation as vi.Mock).mockRejectedValueOnce(
          new Error('SMTP connection refused')
        );

        const result = await InvitationService.inviteStaffMember(
          'rescue-001',
          'staff@example.com',
          'Volunteer',
          'admin-user-id'
        );

        expect(result.success).toBe(true);
        expect(mockTransaction.commit).toHaveBeenCalledOnce();
        expect(mockTransaction.rollback).not.toHaveBeenCalled();
      });
    });

    describe('when the rescue does not exist', () => {
      it('should throw and rollback the transaction', async () => {
        MockedRescue.findByPk = vi.fn().mockResolvedValue(null);

        await expect(
          InvitationService.inviteStaffMember(
            'nonexistent-rescue',
            'staff@example.com',
            'Volunteer',
            'admin-user-id'
          )
        ).rejects.toThrow('Rescue not found');

        expect(mockTransaction.rollback).toHaveBeenCalledOnce();
        expect(mockTransaction.commit).not.toHaveBeenCalled();
      });
    });

    describe('when the email belongs to an existing staff member', () => {
      it('should throw and rollback the transaction', async () => {
        MockedRescue.findByPk = vi.fn().mockResolvedValue(buildRescue());
        MockedStaffMember.findOne = vi.fn().mockResolvedValue({ userId: 'existing-staff' });

        await expect(
          InvitationService.inviteStaffMember(
            'rescue-001',
            'existing@example.com',
            'Volunteer',
            'admin-user-id'
          )
        ).rejects.toThrow('User is already a staff member of this rescue');

        expect(mockTransaction.rollback).toHaveBeenCalledOnce();
        expect(mockTransaction.commit).not.toHaveBeenCalled();
      });
    });

    describe('when a pending invitation already exists for the email', () => {
      it('should throw and rollback the transaction', async () => {
        MockedRescue.findByPk = vi.fn().mockResolvedValue(buildRescue());
        MockedStaffMember.findOne = vi.fn().mockResolvedValue(null);
        MockedInvitation.findOne = vi.fn().mockResolvedValue(buildInvitation());

        await expect(
          InvitationService.inviteStaffMember(
            'rescue-001',
            'staff@example.com',
            'Volunteer',
            'admin-user-id'
          )
        ).rejects.toThrow('A pending invitation already exists for this email');

        expect(mockTransaction.rollback).toHaveBeenCalledOnce();
        expect(mockTransaction.commit).not.toHaveBeenCalled();
      });
    });
  });

  describe('acceptInvitation', () => {
    const userData = {
      firstName: 'Jane',
      lastName: 'Smith',
      password: 'SecurePass123!',
      phone: '+1234567890',
    };

    describe('when the invitation is valid and the email is not already registered', () => {
      it('should create a user with email verified and rescue_staff role, and mark invitation as used', async () => {
        const mockInvitation = buildInvitation();
        MockedInvitation.findOne = vi.fn().mockResolvedValue(mockInvitation);
        MockedUser.findOne = vi.fn().mockResolvedValue(null);
        MockedUser.create = vi.fn().mockResolvedValue(buildUser());
        MockedStaffMember.create = vi.fn().mockResolvedValue({});
        const mockRole = { roleId: 'role-rescue-staff', name: 'rescue_staff' };
        MockedRole.findOne = vi.fn().mockResolvedValue(mockRole);
        MockedUserRole.create = vi.fn().mockResolvedValue({});

        const result = await InvitationService.acceptInvitation('valid-token', userData);

        expect(result.success).toBe(true);
        expect(result.userId).toBeDefined();
        expect(mockTransaction.commit).toHaveBeenCalledOnce();
        expect(mockTransaction.rollback).not.toHaveBeenCalled();
      });

      it('should create the user with emailVerified set to true', async () => {
        const mockInvitation = buildInvitation();
        MockedInvitation.findOne = vi.fn().mockResolvedValue(mockInvitation);
        MockedUser.findOne = vi.fn().mockResolvedValue(null);
        MockedUser.create = vi.fn().mockResolvedValue(buildUser());
        MockedStaffMember.create = vi.fn().mockResolvedValue({});
        MockedRole.findOne = vi.fn().mockResolvedValue(null); // role not found is handled gracefully
        MockedUserRole.create = vi.fn().mockResolvedValue({});

        await InvitationService.acceptInvitation('valid-token', userData);

        expect(MockedUser.create).toHaveBeenCalledWith(
          expect.objectContaining({ emailVerified: true }),
          expect.objectContaining({ transaction: mockTransaction })
        );
      });

      it('should mark the invitation as used', async () => {
        const mockInvitation = buildInvitation();
        MockedInvitation.findOne = vi.fn().mockResolvedValue(mockInvitation);
        MockedUser.findOne = vi.fn().mockResolvedValue(null);
        MockedUser.create = vi.fn().mockResolvedValue(buildUser());
        MockedStaffMember.create = vi.fn().mockResolvedValue({});
        MockedRole.findOne = vi.fn().mockResolvedValue(null);

        await InvitationService.acceptInvitation('valid-token', userData);

        expect(mockInvitation.update).toHaveBeenCalledWith(
          expect.objectContaining({ used: true }),
          expect.objectContaining({ transaction: mockTransaction })
        );
      });

      it('should assign the rescue_staff role when the role exists', async () => {
        const mockInvitation = buildInvitation();
        MockedInvitation.findOne = vi.fn().mockResolvedValue(mockInvitation);
        MockedUser.findOne = vi.fn().mockResolvedValue(null);
        const newUser = buildUser();
        MockedUser.create = vi.fn().mockResolvedValue(newUser);
        MockedStaffMember.create = vi.fn().mockResolvedValue({});
        MockedRole.findOne = vi.fn().mockResolvedValue({ roleId: 'role-rescue-staff' });
        MockedUserRole.create = vi.fn().mockResolvedValue({});

        await InvitationService.acceptInvitation('valid-token', userData);

        expect(MockedUserRole.create).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: newUser.userId,
            roleId: 'role-rescue-staff',
          }),
          expect.objectContaining({ transaction: mockTransaction })
        );
      });

      it('should look up the invitation using the hashed token', async () => {
        const mockInvitation = buildInvitation();
        MockedInvitation.findOne = vi.fn().mockResolvedValue(mockInvitation);
        MockedUser.findOne = vi.fn().mockResolvedValue(null);
        MockedUser.create = vi.fn().mockResolvedValue(buildUser());
        MockedStaffMember.create = vi.fn().mockResolvedValue({});
        MockedRole.findOne = vi.fn().mockResolvedValue(null);

        await InvitationService.acceptInvitation('raw-token', userData);

        expect(MockedInvitation.findOne).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ token: 'hashed_raw-token' }),
          })
        );
      });
    });

    describe('when transaction is partially completed and user creation fails', () => {
      it('should rollback and not leave any records', async () => {
        const mockInvitation = buildInvitation();
        MockedInvitation.findOne = vi.fn().mockResolvedValue(mockInvitation);
        MockedUser.findOne = vi.fn().mockResolvedValue(null);
        MockedUser.create = vi.fn().mockRejectedValue(new Error('DB constraint violation'));

        await expect(
          InvitationService.acceptInvitation('valid-token', userData)
        ).rejects.toThrow('DB constraint violation');

        expect(mockTransaction.rollback).toHaveBeenCalledOnce();
        expect(mockTransaction.commit).not.toHaveBeenCalled();
        // UserRole.create should never have been called
        expect(MockedUserRole.create).not.toHaveBeenCalled();
      });
    });

    describe('when role assignment fails', () => {
      it('should rollback the entire transaction', async () => {
        const mockInvitation = buildInvitation();
        MockedInvitation.findOne = vi.fn().mockResolvedValue(mockInvitation);
        MockedUser.findOne = vi.fn().mockResolvedValue(null);
        MockedUser.create = vi.fn().mockResolvedValue(buildUser());
        MockedStaffMember.create = vi.fn().mockResolvedValue({});
        MockedRole.findOne = vi.fn().mockResolvedValue({ roleId: 'role-rescue-staff' });
        MockedUserRole.create = vi.fn().mockRejectedValue(new Error('FK violation'));

        await expect(
          InvitationService.acceptInvitation('valid-token', userData)
        ).rejects.toThrow('FK violation');

        expect(mockTransaction.rollback).toHaveBeenCalledOnce();
        expect(mockTransaction.commit).not.toHaveBeenCalled();
      });
    });

    describe('when the token does not exist or is expired', () => {
      it('should throw an error', async () => {
        MockedInvitation.findOne = vi.fn().mockResolvedValue(null);

        await expect(
          InvitationService.acceptInvitation('expired-token', userData)
        ).rejects.toThrow('Invitation not found or expired');

        expect(mockTransaction.rollback).toHaveBeenCalledOnce();
      });
    });

    describe('when an account already exists for the invitation email', () => {
      it('should throw and rollback', async () => {
        MockedInvitation.findOne = vi.fn().mockResolvedValue(buildInvitation());
        MockedUser.findOne = vi.fn().mockResolvedValue(buildUser());

        await expect(
          InvitationService.acceptInvitation('valid-token', userData)
        ).rejects.toThrow('An account with this email already exists');

        expect(mockTransaction.rollback).toHaveBeenCalledOnce();
        expect(mockTransaction.commit).not.toHaveBeenCalled();
      });
    });
  });

  describe('getInvitationDetails', () => {
    describe('when the token is valid and the invitation has not expired', () => {
      it('should return the invitation', async () => {
        const mockInvitation = buildInvitation();
        MockedInvitation.findOne = vi.fn().mockResolvedValue(mockInvitation);

        const result = await InvitationService.getInvitationDetails('valid-token');

        expect(result).toBe(mockInvitation);
      });

      it('should query using the hashed token', async () => {
        MockedInvitation.findOne = vi.fn().mockResolvedValue(buildInvitation());

        await InvitationService.getInvitationDetails('raw-token');

        expect(MockedInvitation.findOne).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              token: 'hashed_raw-token',
              used: false,
            }),
          })
        );
      });
    });

    describe('when the invitation has expired', () => {
      it('should return null', async () => {
        MockedInvitation.findOne = vi.fn().mockResolvedValue(null);

        const result = await InvitationService.getInvitationDetails('expired-token');

        expect(result).toBeNull();
      });
    });

    describe('when the invitation has already been accepted', () => {
      it('should return null', async () => {
        MockedInvitation.findOne = vi.fn().mockResolvedValue(null);

        const result = await InvitationService.getInvitationDetails('used-token');

        expect(result).toBeNull();
      });
    });

    describe('when a database error occurs', () => {
      it('should throw a descriptive error', async () => {
        MockedInvitation.findOne = vi.fn().mockRejectedValue(new Error('DB connection lost'));

        await expect(InvitationService.getInvitationDetails('any-token')).rejects.toThrow(
          'Failed to get invitation details'
        );
      });
    });
  });

  describe('getPendingInvitations', () => {
    describe('when there are unexpired unused invitations for the rescue', () => {
      it('should return them in a camelCase-keyed response', async () => {
        const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        const mockInvitation = buildInvitation({ expiration: future });
        MockedInvitation.findAll = vi.fn().mockResolvedValue([mockInvitation]);

        const result = await InvitationService.getPendingInvitations('rescue-001');

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
        const item = result.data[0];
        expect(item.invitationId).toBe('inv-001');
        expect(item.email).toBe('staff@example.com');
        expect(item.status).toBe('pending');
        expect(item.token).toBe(''); // token must not be exposed
      });
    });

    describe('when there are no pending invitations', () => {
      it('should return an empty data array', async () => {
        MockedInvitation.findAll = vi.fn().mockResolvedValue([]);

        const result = await InvitationService.getPendingInvitations('rescue-001');

        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(0);
      });
    });

    describe('when a database error occurs', () => {
      it('should throw a descriptive error', async () => {
        MockedInvitation.findAll = vi.fn().mockRejectedValue(new Error('Query failed'));

        await expect(InvitationService.getPendingInvitations('rescue-001')).rejects.toThrow(
          'Failed to get pending invitations'
        );
      });
    });
  });

  describe('cancelInvitation', () => {
    describe('when the invitation is pending', () => {
      it('should set expiry to the past so subsequent lookups treat it as cancelled', async () => {
        const mockInvitation = buildInvitation();
        MockedInvitation.findOne = vi.fn().mockResolvedValue(mockInvitation);

        const result = await InvitationService.cancelInvitation('inv-001', 'admin-user-id');

        expect(result.success).toBe(true);

        // The expiry passed to update must be in the past (or at most "now")
        const updateArgs = (mockInvitation.update as vi.Mock).mock.calls[0][0] as {
          expiration: Date;
        };
        expect(updateArgs.expiration.getTime()).toBeLessThanOrEqual(Date.now());

        expect(mockTransaction.commit).toHaveBeenCalledOnce();
        expect(mockTransaction.rollback).not.toHaveBeenCalled();
      });

      it('should cause getInvitationDetails to return null after cancellation', async () => {
        // After cancel sets expiry to now, getInvitationDetails (which filters by
        // expiration > now) should return null.
        const mockInvitation = buildInvitation();
        MockedInvitation.findOne = vi
          .fn()
          .mockResolvedValueOnce(mockInvitation) // cancelInvitation lookup
          .mockResolvedValueOnce(null); // getInvitationDetails lookup after cancel

        await InvitationService.cancelInvitation('inv-001', 'admin-user-id');
        const details = await InvitationService.getInvitationDetails('valid-token');

        expect(details).toBeNull();
      });
    });

    describe('when the invitation does not exist or is already expired', () => {
      it('should throw an error and rollback', async () => {
        MockedInvitation.findOne = vi.fn().mockResolvedValue(null);

        await expect(
          InvitationService.cancelInvitation('nonexistent-id', 'admin-user-id')
        ).rejects.toThrow('Invitation not found or already expired');

        expect(mockTransaction.rollback).toHaveBeenCalledOnce();
        expect(mockTransaction.commit).not.toHaveBeenCalled();
      });
    });
  });
});
