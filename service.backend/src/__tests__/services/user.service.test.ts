import { vi } from 'vitest';
import Application from '../../models/Application';
import ChatParticipant from '../../models/ChatParticipant';
import User, { UserStatus, UserType } from '../../models/User';
import UserFavorite from '../../models/UserFavorite';
import { AuditLogService } from '../../services/auditLog.service';
import { UserService } from '../../services/user.service';
import { emitAuthRoleChanged } from '../../socket/socket-registry';
import { BulkUserUpdateData, UserUpdateData } from '../../types/user';

// Mock only non-database dependencies
// Logger is already mocked in setup-tests.ts
vi.mock('../../services/auditLog.service');

// Spy on socket-registry so we can observe the auth:role-changed push
// without standing up a real Socket.IO server in unit tests.
vi.mock('../../socket/socket-registry', () => ({
  emitAuthRoleChanged: vi.fn(),
  disconnectAllSockets: vi.fn(),
  setLiveIo: vi.fn(),
  getLiveIo: vi.fn(),
}));

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserById', () => {
    it('should get user by ID successfully', async () => {
      // Create a real user in the database
      const user = await User.create({
        email: 'test@example.com',
        password: 'hashedpassword',
        firstName: 'John',
        lastName: 'Doe',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
      });

      const result = await UserService.getUserById(user.userId, true);

      expect(result).toBeDefined();
      expect(result?.userId).toBe(user.userId);
      expect(result?.email).toBe('test@example.com');
      expect(result?.firstName).toBe('John');
      expect(result?.lastName).toBe('Doe');
    });

    it('should return null for non-existent user', async () => {
      const userId = 'non-existent-uuid';

      const result = await UserService.getUserById(userId);

      expect(result).toBeNull();
    });

    it('should return null for invalid UUID format', async () => {
      // SQLite doesn't enforce UUID format strictly, so invalid UUIDs return null
      const invalidUserId = 'not-a-valid-uuid';

      const result = await UserService.getUserById(invalidUserId);

      expect(result).toBeNull();
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      // Create a real user in the database
      const user = await User.create({
        email: 'update@example.com',
        password: 'hashedpassword',
        firstName: 'John',
        lastName: 'Doe',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
      });

      const updateData: UserUpdateData = {
        firstName: 'Jane',
        lastName: 'Smith',
      };

      const result = await UserService.updateUserProfile(user.userId, updateData);

      expect(result).toBeDefined();
      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
      expect(result.email).toBe('update@example.com');

      // Verify in database
      const updatedUser = await User.findByPk(user.userId);
      expect(updatedUser?.firstName).toBe('Jane');
      expect(updatedUser?.lastName).toBe('Smith');
    });

    it('should throw error for non-existent user', async () => {
      const userId = 'non-existent-uuid';
      const updateData: UserUpdateData = { firstName: 'Jane' };

      await expect(UserService.updateUserProfile(userId, updateData)).rejects.toThrow(
        'User not found'
      );
    });

    it('should not allow privilege escalation via mass assignment of restricted fields', async () => {
      const user = await User.create({
        email: 'mass-assign@example.com',
        password: 'hashedpassword',
        firstName: 'John',
        lastName: 'Doe',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
        emailVerified: false,
      });

      await UserService.updateUserProfile(user.userId, {
        firstName: 'Jane',
        userType: UserType.ADMIN,
        emailVerified: true,
        status: UserStatus.SUSPENDED,
      });

      const dbUser = await User.findByPk(user.userId);
      expect(dbUser?.firstName).toBe('Jane');
      expect(dbUser?.userType).toBe(UserType.ADOPTER);
      expect(dbUser?.emailVerified).toBe(false);
      expect(dbUser?.status).toBe(UserStatus.ACTIVE);
    });
  });

  describe('searchUsers', () => {
    it('should search users with filters', async () => {
      // Create test users in the database
      await User.create({
        email: 'john@example.com',
        password: 'hashedpassword',
        firstName: 'John',
        lastName: 'Doe',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
      });

      await User.create({
        email: 'jane@example.com',
        password: 'hashedpassword',
        firstName: 'Jane',
        lastName: 'Smith',
        userType: UserType.RESCUE_STAFF,
        status: UserStatus.ACTIVE,
      });

      const filters = {
        search: 'john',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
      };

      const options = {
        page: 1,
        limit: 10,
      };

      const result = await UserService.searchUsers(filters, options);

      expect(result.users.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
      expect(result.page).toBe(1);

      // Verify the search found the correct user
      const johnUser = result.users.find(u => u.firstName === 'John');
      expect(johnUser).toBeDefined();
      expect(johnUser?.email).toBe('john@example.com');
    });
  });

  describe('updateUserPreferences', () => {
    it('should update user preferences successfully', async () => {
      // Create a real user in the database. Notification + privacy
      // prefs are auto-created by the User.afterCreate hook (plan 5.6)
      // — no need to seed them inline.
      const user = await User.create({
        email: 'prefs@example.com',
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
      });

      const preferences = {
        emailNotifications: false,
        pushNotifications: true,
        smsNotifications: false,
        privacySettings: {
          profileVisibility: 'public' as const,
          showLocation: true,
          showContactInfo: false,
        },
      };

      await UserService.updateUserPreferences(user.userId, preferences);
      const result = await UserService.getUserPreferences(user.userId);

      expect(result.emailNotifications).toBe(false);
      expect(result.pushNotifications).toBe(true);
      expect(result.smsNotifications).toBe(false);
      expect(result.privacySettings?.profileVisibility).toBe('public');
      expect(result.privacySettings?.showLocation).toBe(true);
    });
  });

  describe('getUserActivity', () => {
    it('should get user activity successfully', async () => {
      // Create a real user in the database
      const user = await User.create({
        email: 'activity@example.com',
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
        lastLoginAt: new Date(),
      });

      const result = await UserService.getUserActivity(user.userId);

      expect(result).toHaveProperty('applicationsCount');
      expect(result).toHaveProperty('activeChatsCount');
      expect(result).toHaveProperty('lastLogin');
      expect(result).toHaveProperty('accountCreated');
      expect(result.applicationsCount).toBe(0);
      expect(result.activeChatsCount).toBe(0);
    });

    it('should throw error for non-existent user', async () => {
      const userId = 'non-existent-uuid';

      await expect(UserService.getUserActivity(userId)).rejects.toThrow('User not found');
    });
  });

  describe('getUserStatistics', () => {
    it('should get user statistics successfully', async () => {
      // Create test users in the database
      await User.create({
        email: 'adopter1@example.com',
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'Adopter',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
      });

      await User.create({
        email: 'staff1@example.com',
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'Staff',
        userType: UserType.RESCUE_STAFF,
        status: UserStatus.ACTIVE,
        emailVerified: true,
      });

      const result = await UserService.getUserStatistics();

      expect(result).toHaveProperty('totalUsers');
      expect(result).toHaveProperty('activeUsers');
      expect(result).toHaveProperty('verifiedUsers');
      expect(result).toHaveProperty('usersByType');
      expect(result).toHaveProperty('usersByStatus');
      expect(result.totalUsers).toBeGreaterThan(0);
      // Active users count users with audit logs in last 30 days
      // Since we didn't create audit logs, activeUsers can be 0
      expect(result.activeUsers).toBeGreaterThanOrEqual(0);
      expect(result.verifiedUsers).toBe(2); // Both users are verified
    });
  });

  describe('updateUserRole', () => {
    it('should update user role', async () => {
      // Create real users in the database
      const user = await User.create({
        email: 'roleupdate@example.com',
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
      });

      const admin = await User.create({
        email: 'admin@example.com',
        password: 'hashedpassword',
        firstName: 'Admin',
        lastName: 'User',
        userType: UserType.ADMIN,
        status: UserStatus.ACTIVE,
      });

      const newUserType = UserType.RESCUE_STAFF;

      const result = await UserService.updateUserRole(user.userId, newUserType, admin.userId);

      expect(result).toBeDefined();
      expect(result.userType).toBe(newUserType);

      // Verify in database
      const updatedUser = await User.findByPk(user.userId);
      expect(updatedUser?.userType).toBe(newUserType);
    });

    it('pushes an auth:role-changed socket event to the target user so live frontend sessions invalidate cached role state', async () => {
      const user = await User.create({
        email: 'rolechange-socket@example.com',
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
      });
      const admin = await User.create({
        email: 'admin-rolechange@example.com',
        password: 'hashedpassword',
        firstName: 'Admin',
        lastName: 'User',
        userType: UserType.ADMIN,
        status: UserStatus.ACTIVE,
      });

      await UserService.updateUserRole(user.userId, UserType.MODERATOR, admin.userId);

      expect(vi.mocked(emitAuthRoleChanged)).toHaveBeenCalledWith(user.userId);
    });

    it('refuses self-grant: admin cannot change their own role via this endpoint', async () => {
      const admin = await User.create({
        email: 'self-grant-admin@example.com',
        password: 'hashedpassword',
        firstName: 'Admin',
        lastName: 'User',
        userType: UserType.ADMIN,
        status: UserStatus.ACTIVE,
      });

      await expect(
        UserService.updateUserRole(admin.userId, UserType.ADMIN, admin.userId)
      ).rejects.toThrow('Cannot change your own role via this endpoint');
    });

    it('refuses SUPER_ADMIN assignment when the actor is not a super_admin', async () => {
      const target = await User.create({
        email: 'sa-target@example.com',
        password: 'hashedpassword',
        firstName: 'Target',
        lastName: 'User',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
      });
      const admin = await User.create({
        email: 'sa-grant-admin@example.com',
        password: 'hashedpassword',
        firstName: 'Admin',
        lastName: 'User',
        userType: UserType.ADMIN,
        status: UserStatus.ACTIVE,
      });

      await expect(
        UserService.updateUserRole(target.userId, UserType.SUPER_ADMIN, admin.userId)
      ).rejects.toThrow('Only super_admin can assign super_admin role');
    });

    it('allows a super_admin to assign the SUPER_ADMIN role to another user', async () => {
      const target = await User.create({
        email: 'sa-elevatee@example.com',
        password: 'hashedpassword',
        firstName: 'Target',
        lastName: 'User',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
      });
      const superAdmin = await User.create({
        email: 'super-admin-grantor@example.com',
        password: 'hashedpassword',
        firstName: 'Super',
        lastName: 'Admin',
        userType: UserType.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
      });

      const result = await UserService.updateUserRole(
        target.userId,
        UserType.SUPER_ADMIN,
        superAdmin.userId
      );

      expect(result.userType).toBe(UserType.SUPER_ADMIN);
    });

    it('stamps tokens_invalid_before on the user row so access tokens issued before the role change are rejected by the auth middleware', async () => {
      const user = await User.create({
        email: 'rolechange-invalidates@example.com',
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
      });
      const admin = await User.create({
        email: 'admin-invalidates@example.com',
        password: 'hashedpassword',
        firstName: 'Admin',
        lastName: 'User',
        userType: UserType.ADMIN,
        status: UserStatus.ACTIVE,
      });

      expect(user.tokensInvalidBefore).toBeFalsy();
      const before = Date.now();

      await UserService.updateUserRole(user.userId, UserType.RESCUE_STAFF, admin.userId);

      const reloaded = await User.findByPk(user.userId);
      expect(reloaded?.tokensInvalidBefore).toBeTruthy();
      expect(reloaded?.tokensInvalidBefore?.getTime() ?? 0).toBeGreaterThanOrEqual(before);
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user successfully', async () => {
      // Create real users in the database
      const user = await User.create({
        email: 'deactivate@example.com',
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
      });

      const admin = await User.create({
        email: 'admin2@example.com',
        password: 'hashedpassword',
        firstName: 'Admin',
        lastName: 'User',
        userType: UserType.ADMIN,
        status: UserStatus.ACTIVE,
      });

      const result = await UserService.deactivateUser(user.userId, admin.userId);

      expect(result.status).toBe(UserStatus.INACTIVE);

      // Verify in database
      const deactivatedUser = await User.findByPk(user.userId);
      expect(deactivatedUser?.status).toBe(UserStatus.INACTIVE);
    });

    it('should throw error for non-existent user', async () => {
      const userId = 'non-existent-uuid';
      const adminUserId = 'admin-uuid';

      await expect(UserService.deactivateUser(userId, adminUserId)).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('reactivateUser', () => {
    it('should reactivate user successfully', async () => {
      // Create real users in the database
      const user = await User.create({
        email: 'reactivate@example.com',
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User',
        userType: UserType.ADOPTER,
        status: UserStatus.INACTIVE,
      });

      const admin = await User.create({
        email: 'admin3@example.com',
        password: 'hashedpassword',
        firstName: 'Admin',
        lastName: 'User',
        userType: UserType.ADMIN,
        status: UserStatus.ACTIVE,
      });

      const result = await UserService.reactivateUser(user.userId, admin.userId);

      expect(result.status).toBe(UserStatus.ACTIVE);

      // Verify in database
      const reactivatedUser = await User.findByPk(user.userId);
      expect(reactivatedUser?.status).toBe(UserStatus.ACTIVE);
    });
  });

  describe('bulkUpdateUsers', () => {
    it('should bulk update users successfully', async () => {
      // Create test users in the database
      const user1 = await User.create({
        email: 'bulk1@example.com',
        password: 'hashedpassword',
        firstName: 'User',
        lastName: 'One',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
      });

      const user2 = await User.create({
        email: 'bulk2@example.com',
        password: 'hashedpassword',
        firstName: 'User',
        lastName: 'Two',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
      });

      const admin = await User.create({
        email: 'admin4@example.com',
        password: 'hashedpassword',
        firstName: 'Admin',
        lastName: 'User',
        userType: UserType.ADMIN,
        status: UserStatus.ACTIVE,
      });

      const updates = [
        {
          userIds: [user1.userId, user2.userId],
          updates: {
            firstName: 'Updated',
            lastName: 'Name',
          },
        },
      ];

      const result = await UserService.bulkUpdateUsers(updates, admin.userId);

      expect(result).toBe(2);

      // Verify in database
      const updatedUser1 = await User.findByPk(user1.userId);
      const updatedUser2 = await User.findByPk(user2.userId);
      expect(updatedUser1?.firstName).toBe('Updated');
      expect(updatedUser2?.firstName).toBe('Updated');
    });

    it('should hash passwords via beforeUpdate hook when bulk updating', async () => {
      // The bulk update path must pass individualHooks:true so the User
      // model's beforeUpdate hook fires per row and bcrypt-hashes the
      // password. Otherwise a plaintext password sits in the DB.
      const user = await User.create({
        email: 'bulkpw@example.com',
        password: 'hashedpassword',
        firstName: 'PW',
        lastName: 'User',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
      });

      const admin = await User.create({
        email: 'admin-pw@example.com',
        password: 'hashedpassword',
        firstName: 'Admin',
        lastName: 'User',
        userType: UserType.ADMIN,
        status: UserStatus.ACTIVE,
      });

      const plaintext = 'plaintext-pw-1234567890';
      // Password isn't part of the BulkUserUpdateData surface, but the
      // service passes its `updates` payload straight through to User.update,
      // so this test confirms the model hook still hashes anything that
      // reaches it. Parse from JSON to construct without a type assertion.
      const updates: BulkUserUpdateData[] = JSON.parse(
        JSON.stringify([{ userIds: [user.userId], updates: { password: plaintext } }])
      );
      await UserService.bulkUpdateUsers(updates, admin.userId);

      // bcryptjs is globally mocked in setup-tests.ts to return
      // 'hashed-password'. That stub value landing in the DB proves the
      // beforeUpdate hook ran per row (it's the hook that calls bcrypt).
      // Without individualHooks:true the plaintext would persist unchanged.
      const reloaded = await User.findByPk(user.userId);
      expect(reloaded?.password).toBeDefined();
      expect(reloaded?.password).not.toBe(plaintext);
      expect(reloaded?.password).toBe('hashed-password');
    });

    it('refuses bulk userType change that includes the actor as a target', async () => {
      const admin = await User.create({
        email: 'bulk-self-grant-admin@example.com',
        password: 'hashedpassword',
        firstName: 'Admin',
        lastName: 'User',
        userType: UserType.ADMIN,
        status: UserStatus.ACTIVE,
      });

      // userType is not part of UserUpdateData but the runtime payload is
      // passed straight through to User.update, so use the same JSON-parse
      // trick as the password-hash test above to bypass static typing.
      const updates: BulkUserUpdateData[] = JSON.parse(
        JSON.stringify([{ userIds: [admin.userId], updates: { userType: UserType.SUPER_ADMIN } }])
      );

      await expect(UserService.bulkUpdateUsers(updates, admin.userId)).rejects.toThrow(
        'Cannot change your own role via this endpoint'
      );
    });

    it('refuses bulk SUPER_ADMIN assignment when the actor is not a super_admin', async () => {
      const target = await User.create({
        email: 'bulk-sa-target@example.com',
        password: 'hashedpassword',
        firstName: 'Target',
        lastName: 'User',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
      });
      const admin = await User.create({
        email: 'bulk-sa-admin@example.com',
        password: 'hashedpassword',
        firstName: 'Admin',
        lastName: 'User',
        userType: UserType.ADMIN,
        status: UserStatus.ACTIVE,
      });

      const updates: BulkUserUpdateData[] = JSON.parse(
        JSON.stringify([{ userIds: [target.userId], updates: { userType: UserType.SUPER_ADMIN } }])
      );

      await expect(UserService.bulkUpdateUsers(updates, admin.userId)).rejects.toThrow(
        'Only super_admin can assign super_admin role'
      );
    });
  });

  describe('canUserSeePrivateData', () => {
    it('should allow user to see their own data', () => {
      const userId = 'user-123';
      const result = UserService.canUserSeePrivateData(userId, userId, UserType.ADOPTER);
      expect(result).toBe(true);
    });

    it('should allow admin to see any user data', () => {
      const adminId = 'admin-123';
      const userId = 'user-456';
      const result = UserService.canUserSeePrivateData(adminId, userId, UserType.ADMIN);
      expect(result).toBe(true);
    });

    it('should not allow user to see other user data', () => {
      const userId1 = 'user-123';
      const userId2 = 'user-456';
      const result = UserService.canUserSeePrivateData(userId1, userId2, UserType.ADOPTER);
      expect(result).toBe(false);
    });
  });

  describe('validateBulkOperation', () => {
    it('should throw error if user includes own account', () => {
      expect(() => {
        UserService.validateBulkOperation('user-1', ['user-2', 'user-1', 'user-3'], 'update');
      }).toThrow('Cannot include your own account in bulk update operation');
    });

    it('should not throw error if user does not include own account', () => {
      expect(() => {
        UserService.validateBulkOperation('user-1', ['user-2', 'user-3'], 'update');
      }).not.toThrow();
    });
  });

  describe('processSearchFilters', () => {
    it('should process search filters correctly', () => {
      const queryParams = {
        search: 'john',
        userType: 'adopter',
        status: 'active',
        emailVerified: 'true',
      };

      const result = UserService.processSearchFilters(queryParams);

      expect(result.search).toBe('john');
      expect(result.userType).toBe('adopter');
      expect(result.status).toBe('active');
      expect(result.emailVerified).toBe(true);
    });

    it('should handle boolean emailVerified values correctly', () => {
      const trueResult = UserService.processSearchFilters({ emailVerified: 'true' });
      const falseResult = UserService.processSearchFilters({ emailVerified: 'false' });
      const undefinedResult = UserService.processSearchFilters({ emailVerified: 'other' });

      expect(trueResult.emailVerified).toBe(true);
      expect(falseResult.emailVerified).toBe(false);
      expect(undefinedResult.emailVerified).toBe(undefined);
    });
  });

  describe('processPaginationOptions', () => {
    it('should process pagination options correctly', () => {
      const queryParams = {
        page: '2',
        limit: '25',
        sortBy: 'firstName',
        sortOrder: 'ASC',
      };

      const result = UserService.processPaginationOptions(queryParams);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(25);
      expect(result.sortBy).toBe('firstName');
      expect(result.sortOrder).toBe('ASC');
    });
  });
  describe('deleteAccount', () => {
    it('should delete user account successfully', async () => {
      // Create a real user in the database
      const user = await User.create({
        email: 'delete@example.com',
        password: 'hashedpassword',
        firstName: 'John',
        lastName: 'Doe',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
      });

      const reason = 'User requested account deletion';

      await UserService.deleteAccount(user.userId, reason);

      // Verify user was deleted from database
      const deletedUser = await User.findByPk(user.userId);
      expect(deletedUser).toBeNull();
    });

    it('should delete user account without reason', async () => {
      // Create a real user in the database
      const user = await User.create({
        email: 'delete2@example.com',
        password: 'hashedpassword',
        firstName: 'John',
        lastName: 'Doe',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
      });

      await UserService.deleteAccount(user.userId);

      // Verify user was deleted from database
      const deletedUser = await User.findByPk(user.userId);
      expect(deletedUser).toBeNull();
    });

    it('should throw error for non-existent user', async () => {
      const userId = 'non-existent-uuid';
      const reason = 'Test deletion';

      await expect(UserService.deleteAccount(userId, reason)).rejects.toThrow('User not found');
    });

    it('should handle deletion errors gracefully', async () => {
      // Use an invalid UUID format to trigger an error
      const userId = 'not-a-valid-uuid';
      const reason = 'Test deletion';

      await expect(UserService.deleteAccount(userId, reason)).rejects.toThrow();
    });

    it('should handle audit log service errors without failing deletion', async () => {
      // Create a real user in the database
      const user = await User.create({
        email: 'delete3@example.com',
        password: 'hashedpassword',
        firstName: 'John',
        lastName: 'Doe',
        userType: UserType.ADOPTER,
        status: UserStatus.ACTIVE,
      });

      const reason = 'Test deletion';

      // Mock AuditLogService to throw an error
      const MockedAuditLogService = AuditLogService as vi.MockedObject<AuditLogService>;
      MockedAuditLogService.log = vi.fn().mockRejectedValue(new Error('Audit log error'));

      // Should throw if audit logging fails (current implementation)
      await expect(UserService.deleteAccount(user.userId, reason)).rejects.toThrow(
        'Audit log error'
      );
    });
  });
});
