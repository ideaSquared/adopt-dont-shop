import { describe, it, expect } from 'vitest';
import AuditLog from '../../models/AuditLog';
import IpRule, { IpRuleType } from '../../models/IpRule';
import RefreshToken from '../../models/RefreshToken';
import User, { UserStatus, UserType } from '../../models/User';
import SecurityService from '../../services/security.service';

const makeUser = async (
  overrides: Partial<{ email: string; lockedUntil: Date | null; loginAttempts: number }> = {}
) =>
  User.create({
    email: overrides.email ?? `${Math.random().toString(36).slice(2)}@test.dev`,
    password: 'Hash$ed1234',
    firstName: 'Test',
    lastName: 'User',
    status: UserStatus.ACTIVE,
    userType: UserType.ADMIN,
    loginAttempts: overrides.loginAttempts ?? 0,
    lockedUntil: overrides.lockedUntil ?? null,
  });

const makeRefreshToken = async (
  userId: string,
  opts: Partial<{ revoked: boolean; expiresAt: Date }> = {}
) =>
  RefreshToken.create({
    user_id: userId,
    family_id: `fam-${Math.random().toString(36).slice(2)}`,
    is_revoked: opts.revoked ?? false,
    expires_at: opts.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    replaced_by_token_id: null,
  });

describe('SecurityService', () => {
  describe('listSessions', () => {
    it('returns only non-revoked, non-expired tokens', async () => {
      const user = await makeUser();
      const active = await makeRefreshToken(user.userId);
      await makeRefreshToken(user.userId, { revoked: true });
      await makeRefreshToken(user.userId, { expiresAt: new Date(Date.now() - 1000) });

      const result = await SecurityService.listSessions();
      expect(result.total).toBe(1);
      expect(result.sessions[0].sessionId).toBe(active.token_id);
    });

    it('filters by user', async () => {
      const userA = await makeUser();
      const userB = await makeUser();
      await makeRefreshToken(userA.userId);
      await makeRefreshToken(userB.userId);

      const result = await SecurityService.listSessions({ userId: userA.userId });
      expect(result.total).toBe(1);
      expect(result.sessions[0].userId).toBe(userA.userId);
    });
  });

  describe('revokeSession', () => {
    it('marks the row revoked and writes an audit log', async () => {
      const admin = await makeUser({ email: 'admin@test.dev' });
      const user = await makeUser();
      const token = await makeRefreshToken(user.userId);

      await SecurityService.revokeSession(token.token_id, admin.userId);

      const refreshed = await RefreshToken.findByPk(token.token_id);
      expect(refreshed?.is_revoked).toBe(true);

      const log = await AuditLog.findOne({ where: { action: 'SESSION_REVOKED' } });
      expect(log).toBeTruthy();
      expect(log!.user).toBe(admin.userId);
    });

    it('throws when the session does not exist', async () => {
      const admin = await makeUser();
      await expect(
        SecurityService.revokeSession('00000000-0000-0000-0000-000000000000', admin.userId)
      ).rejects.toThrow('Session not found');
    });
  });

  describe('revokeAllUserSessions', () => {
    it('revokes only the target user’s active sessions', async () => {
      const admin = await makeUser();
      const target = await makeUser();
      const other = await makeUser();
      await makeRefreshToken(target.userId);
      await makeRefreshToken(target.userId);
      await makeRefreshToken(other.userId);

      const count = await SecurityService.revokeAllUserSessions(target.userId, admin.userId);
      expect(count).toBe(2);

      const otherUserActive = await RefreshToken.count({
        where: { user_id: other.userId, is_revoked: false },
      });
      expect(otherUserActive).toBe(1);
    });
  });

  describe('IP rules', () => {
    it('rejects an invalid CIDR on create', async () => {
      const admin = await makeUser();
      await expect(
        SecurityService.createIpRule({
          type: IpRuleType.BLOCK,
          cidr: 'not-an-ip',
          actorId: admin.userId,
        })
      ).rejects.toThrow('Invalid CIDR or IP address');
    });

    it('evaluateIp allows everyone when no rules exist', async () => {
      const decision = await SecurityService.evaluateIp('8.8.8.8');
      expect(decision.allowed).toBe(true);
    });

    it('evaluateIp blocks an IP matching a block rule', async () => {
      const admin = await makeUser();
      await SecurityService.createIpRule({
        type: IpRuleType.BLOCK,
        cidr: '10.0.0.0/8',
        actorId: admin.userId,
      });

      const blocked = await SecurityService.evaluateIp('10.5.4.3');
      expect(blocked.allowed).toBe(false);

      const allowed = await SecurityService.evaluateIp('11.0.0.1');
      expect(allowed.allowed).toBe(true);
    });

    it('evaluateIp requires a match when allow rules exist', async () => {
      const admin = await makeUser();
      await SecurityService.createIpRule({
        type: IpRuleType.ALLOW,
        cidr: '192.168.0.0/16',
        actorId: admin.userId,
      });

      expect((await SecurityService.evaluateIp('192.168.1.42')).allowed).toBe(true);
      expect((await SecurityService.evaluateIp('1.2.3.4')).allowed).toBe(false);
    });

    it('evaluateIp lets block rules win even when an allow rule matches', async () => {
      const admin = await makeUser();
      await SecurityService.createIpRule({
        type: IpRuleType.ALLOW,
        cidr: '10.0.0.0/8',
        actorId: admin.userId,
      });
      await SecurityService.createIpRule({
        type: IpRuleType.BLOCK,
        cidr: '10.5.0.0/16',
        actorId: admin.userId,
      });

      expect((await SecurityService.evaluateIp('10.5.4.3')).allowed).toBe(false);
      expect((await SecurityService.evaluateIp('10.6.4.3')).allowed).toBe(true);
    });

    it('evaluateIp ignores expired rules', async () => {
      const admin = await makeUser();
      await IpRule.create({
        type: IpRuleType.BLOCK,
        cidr: '10.0.0.0/8',
        is_active: true,
        expires_at: new Date(Date.now() - 1000),
        created_by: admin.userId,
      });
      const decision = await SecurityService.evaluateIp('10.5.4.3');
      expect(decision.allowed).toBe(true);
    });

    it('deleteIpRule removes the row', async () => {
      const admin = await makeUser();
      const rule = await SecurityService.createIpRule({
        type: IpRuleType.BLOCK,
        cidr: '10.0.0.0/8',
        actorId: admin.userId,
      });
      await SecurityService.deleteIpRule(rule.ipRuleId, admin.userId);
      expect(await IpRule.findByPk(rule.ipRuleId)).toBeNull();
    });
  });

  describe('account recovery', () => {
    it('unlockAccount clears loginAttempts and lockedUntil', async () => {
      const admin = await makeUser();
      const target = await makeUser({
        loginAttempts: 5,
        lockedUntil: new Date(Date.now() + 60_000),
      });

      const result = await SecurityService.unlockAccount(target.userId, admin.userId);
      expect(result.wasLocked).toBe(true);

      const refreshed = await User.findByPk(target.userId);
      expect(refreshed!.loginAttempts).toBe(0);
      expect(refreshed!.lockedUntil).toBeNull();
    });

    it('forceLockAccount sets lockedUntil and revokes sessions', async () => {
      const admin = await makeUser();
      const target = await makeUser();
      await makeRefreshToken(target.userId);
      await makeRefreshToken(target.userId);

      await SecurityService.forceLockAccount(target.userId, admin.userId, 'suspected compromise');

      const refreshed = await User.findByPk(target.userId);
      expect(refreshed!.lockedUntil).not.toBeNull();
      expect(refreshed!.lockedUntil!.getTime()).toBeGreaterThan(Date.now());

      const activeSessions = await RefreshToken.count({
        where: { user_id: target.userId, is_revoked: false },
      });
      expect(activeSessions).toBe(0);
    });
  });

  describe('login history & suspicious activity', () => {
    it('getLoginHistory returns only login-related audit entries', async () => {
      const user = await makeUser();
      await AuditLog.create({
        service: 'svc',
        user: user.userId,
        action: 'LOGIN',
        level: 'INFO',
        status: 'success',
        timestamp: new Date(),
        category: 'auth',
        ip_address: '1.2.3.4',
        user_agent: 'jest',
      });
      await AuditLog.create({
        service: 'svc',
        user: user.userId,
        action: 'CREATE_PET',
        level: 'INFO',
        status: 'success',
        timestamp: new Date(),
        category: 'pet',
      });

      const result = await SecurityService.getLoginHistory();
      expect(result.total).toBe(1);
      expect(result.entries[0].action).toBe('LOGIN');
    });

    it('getSuspiciousActivity groups failures and applies the threshold', async () => {
      const user = await makeUser({ email: 'attacked@test.dev' });
      const now = Date.now();
      for (let i = 0; i < 6; i += 1) {
        await AuditLog.create({
          service: 'svc',
          user: user.userId,
          user_email_snapshot: user.email,
          action: 'LOGIN',
          level: 'WARNING',
          status: 'failure',
          timestamp: new Date(now - i * 60_000),
          category: 'auth',
          ip_address: '203.0.113.1',
        });
      }

      const flagged = await SecurityService.getSuspiciousActivity({ failureThreshold: 5 });
      expect(flagged).toHaveLength(1);
      expect(flagged[0].failureCount).toBe(6);
      expect(flagged[0].userEmail).toBe('attacked@test.dev');
    });

    it('getSuspiciousActivity excludes users below threshold', async () => {
      const user = await makeUser();
      await AuditLog.create({
        service: 'svc',
        user: user.userId,
        action: 'LOGIN',
        level: 'WARNING',
        status: 'failure',
        timestamp: new Date(),
        category: 'auth',
      });

      const flagged = await SecurityService.getSuspiciousActivity({ failureThreshold: 5 });
      expect(flagged).toHaveLength(0);
    });
  });
});
