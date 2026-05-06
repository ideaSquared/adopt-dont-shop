import { Op, WhereOptions } from 'sequelize';
import AuditLog from '../models/AuditLog';
import IpRule, { IpRuleType } from '../models/IpRule';
import RefreshToken from '../models/RefreshToken';
import User from '../models/User';
import { JsonObject } from '../types/common';
import { ipMatches, isValidCidrOrIp } from '../utils/ip-match';
import { loggerHelpers } from '../utils/logger';
import { AuditLogService } from './auditLog.service';

export type SessionRow = {
  sessionId: string;
  userId: string;
  familyId: string;
  isRevoked: boolean;
  expiresAt: Date;
  createdAt: Date;
  user: {
    userId: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
};

export type IpRuleRow = {
  ipRuleId: string;
  type: IpRuleType;
  cidr: string;
  label: string | null;
  isActive: boolean;
  expiresAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type LoginHistoryRow = {
  id: number;
  timestamp: Date;
  action: string;
  status: 'success' | 'failure' | null;
  userId: string | null;
  userEmail: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: JsonObject | null;
};

const LOGIN_HISTORY_ACTIONS = ['LOGIN', 'LOGOUT', 'PASSWORD_RESET', 'TWO_FACTOR'];

class SecurityService {
  /**
   * List active sessions, filtered by user when supplied. Active = not
   * revoked and not expired.
   */
  static async listSessions(
    filters: {
      userId?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ sessions: SessionRow[]; total: number; page: number; totalPages: number }> {
    const { userId, page = 1, limit = 50 } = filters;
    const where: WhereOptions = {
      is_revoked: false,
      expires_at: { [Op.gt]: new Date() },
    };
    if (userId) {
      (where as Record<string, unknown>).user_id = userId;
    }

    const { rows, count } = await RefreshToken.findAndCountAll({
      where,
      include: [
        {
          association: 'User',
          attributes: ['userId', 'email', 'firstName', 'lastName'],
          required: false,
        },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });

    const sessions: SessionRow[] = rows.map(row => {
      const user = (row as RefreshToken & { User?: User }).User ?? null;
      return {
        sessionId: row.token_id,
        userId: row.user_id,
        familyId: row.family_id,
        isRevoked: row.is_revoked,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
        user: user
          ? {
              userId: user.userId,
              email: user.email,
              firstName: user.firstName ?? null,
              lastName: user.lastName ?? null,
            }
          : null,
      };
    });

    return {
      sessions,
      total: count,
      page,
      totalPages: Math.max(1, Math.ceil(count / limit)),
    };
  }

  /**
   * Revoke a single refresh-token row. Returns the user_id so the
   * caller can audit. Throws if the row doesn't exist.
   */
  static async revokeSession(sessionId: string, actorId: string): Promise<{ userId: string }> {
    const row = await RefreshToken.findByPk(sessionId);
    if (!row) {
      throw new Error('Session not found');
    }
    row.is_revoked = true;
    await row.save();

    await AuditLogService.log({
      userId: actorId,
      action: 'SESSION_REVOKED',
      entity: 'refresh_token',
      entityId: row.token_id,
      details: { targetUserId: row.user_id, familyId: row.family_id },
      level: 'WARNING',
      status: 'success',
    });

    loggerHelpers.logSecurity('Admin revoked session', {
      sessionId: row.token_id,
      targetUserId: row.user_id,
      actorId,
    });

    return { userId: row.user_id };
  }

  /**
   * Revoke every active session for a user (force logout everywhere).
   * Returns the count of rows updated.
   */
  static async revokeAllUserSessions(userId: string, actorId: string): Promise<number> {
    const [count] = await RefreshToken.update(
      { is_revoked: true },
      {
        where: {
          user_id: userId,
          is_revoked: false,
          expires_at: { [Op.gt]: new Date() },
        },
      }
    );

    await AuditLogService.log({
      userId: actorId,
      action: 'SESSIONS_REVOKED_ALL',
      entity: 'user',
      entityId: userId,
      details: { revokedCount: count },
      level: 'WARNING',
      status: 'success',
    });

    return count;
  }

  // ------- IP Rules -------

  static async listIpRules(): Promise<IpRuleRow[]> {
    const rows = await IpRule.findAll({ order: [['created_at', 'DESC']] });
    return rows.map(SecurityService.toIpRuleRow);
  }

  static async createIpRule(input: {
    type: IpRuleType;
    cidr: string;
    label?: string | null;
    expiresAt?: Date | null;
    actorId: string;
  }): Promise<IpRuleRow> {
    if (!isValidCidrOrIp(input.cidr)) {
      throw new Error('Invalid CIDR or IP address');
    }
    const row = await IpRule.create({
      type: input.type,
      cidr: input.cidr,
      label: input.label ?? null,
      is_active: true,
      expires_at: input.expiresAt ?? null,
      created_by: input.actorId,
    });

    await AuditLogService.log({
      userId: input.actorId,
      action: 'IP_RULE_CREATED',
      entity: 'ip_rule',
      entityId: row.ip_rule_id,
      details: { type: row.type, cidr: row.cidr, label: row.label },
      level: 'WARNING',
      status: 'success',
    });

    return SecurityService.toIpRuleRow(row);
  }

  static async deleteIpRule(ipRuleId: string, actorId: string): Promise<void> {
    const row = await IpRule.findByPk(ipRuleId);
    if (!row) {
      throw new Error('IP rule not found');
    }
    const snapshot = SecurityService.toIpRuleRow(row);
    await row.destroy();

    await AuditLogService.log({
      userId: actorId,
      action: 'IP_RULE_DELETED',
      entity: 'ip_rule',
      entityId: ipRuleId,
      details: { type: snapshot.type, cidr: snapshot.cidr, label: snapshot.label },
      level: 'WARNING',
      status: 'success',
    });
  }

  /**
   * Decide whether `ip` is allowed under the current IP rule set.
   * Logic:
   *   - block rules win: if the IP matches any active block rule, deny.
   *   - if any active allow rules exist, the IP must match one to pass.
   *   - if no allow rules exist, the IP is allowed by default.
   * Expired or inactive rules are ignored.
   */
  static async evaluateIp(ip: string): Promise<{ allowed: boolean; reason?: string }> {
    const now = new Date();
    const rules = await IpRule.findAll({
      where: {
        is_active: true,
        [Op.or]: [{ expires_at: null }, { expires_at: { [Op.gt]: now } }],
      },
    });

    const blockHit = rules.find(r => r.type === IpRuleType.BLOCK && ipMatches(ip, r.cidr));
    if (blockHit) {
      return { allowed: false, reason: `blocked by rule ${blockHit.ip_rule_id}` };
    }

    const allowRules = rules.filter(r => r.type === IpRuleType.ALLOW);
    if (allowRules.length === 0) {
      return { allowed: true };
    }
    const allowHit = allowRules.find(r => ipMatches(ip, r.cidr));
    if (!allowHit) {
      return { allowed: false, reason: 'not in allow list' };
    }
    return { allowed: true };
  }

  // ------- Account recovery -------

  /**
   * Clear an account lockout (loginAttempts + lockedUntil) and force
   * sessions to be re-established. Used for "account takeover
   * prevention" admin tooling: an admin who suspects a compromise can
   * lock the account, terminate all sessions, then unlock once the
   * user has rotated their credentials out-of-band.
   */
  static async unlockAccount(userId: string, actorId: string): Promise<{ wasLocked: boolean }> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }
    const wasLocked = user.lockedUntil !== null || user.loginAttempts > 0;
    user.loginAttempts = 0;
    user.lockedUntil = null;
    await user.save();

    await AuditLogService.log({
      userId: actorId,
      action: 'ACCOUNT_UNLOCKED',
      entity: 'user',
      entityId: userId,
      details: { wasLocked },
      level: 'WARNING',
      status: 'success',
    });

    return { wasLocked };
  }

  static async forceLockAccount(
    userId: string,
    actorId: string,
    reason: string | null
  ): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }
    // Lock for 24h — long enough that no-one can sign back in via
    // password before the admin has investigated, but auto-clears so
    // a forgotten lock doesn't permanently kill the account.
    user.lockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    await SecurityService.revokeAllUserSessions(userId, actorId);

    await AuditLogService.log({
      userId: actorId,
      action: 'ACCOUNT_FORCE_LOCKED',
      entity: 'user',
      entityId: userId,
      details: { reason: reason || null, lockedUntil: user.lockedUntil.toISOString() },
      level: 'WARNING',
      status: 'success',
    });
  }

  // ------- Login history & suspicious activity -------

  static async getLoginHistory(
    filters: {
      userId?: string;
      status?: 'success' | 'failure';
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    entries: LoginHistoryRow[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { userId, status, startDate, endDate, page = 1, limit = 50 } = filters;
    const where: WhereOptions = {
      action: { [Op.in]: LOGIN_HISTORY_ACTIONS },
    };
    if (userId) {
      (where as Record<string, unknown>).user = userId;
    }
    if (status) {
      (where as Record<string, unknown>).status = status;
    }
    if (startDate && endDate) {
      (where as Record<string, unknown>).timestamp = { [Op.between]: [startDate, endDate] };
    } else if (startDate) {
      (where as Record<string, unknown>).timestamp = { [Op.gte]: startDate };
    } else if (endDate) {
      (where as Record<string, unknown>).timestamp = { [Op.lte]: endDate };
    }

    const { rows, count } = await AuditLog.findAndCountAll({
      where,
      order: [['timestamp', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });

    const entries: LoginHistoryRow[] = rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      action: row.action,
      status: row.status,
      userId: row.user,
      userEmail: row.user_email_snapshot,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      metadata: row.metadata,
    }));

    return {
      entries,
      total: count,
      page,
      totalPages: Math.max(1, Math.ceil(count / limit)),
    };
  }

  /**
   * Cheap heuristic for "suspicious activity": users with N failed
   * logins inside a window. The threshold mirrors the auth lockout
   * logic (5 attempts) so anything flagged here is at risk of being
   * locked out and worth a human look.
   */
  static async getSuspiciousActivity(
    options: {
      failureThreshold?: number;
      windowHours?: number;
    } = {}
  ): Promise<
    Array<{
      userId: string | null;
      userEmail: string | null;
      failureCount: number;
      lastAttempt: Date;
      lastIp: string | null;
    }>
  > {
    const { failureThreshold = 5, windowHours = 24 } = options;
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    const recentFailures = await AuditLog.findAll({
      where: {
        action: 'LOGIN',
        status: 'failure',
        timestamp: { [Op.gte]: since },
      },
      order: [['timestamp', 'DESC']],
    });

    const grouped = new Map<
      string,
      {
        userId: string | null;
        userEmail: string | null;
        failureCount: number;
        lastAttempt: Date;
        lastIp: string | null;
      }
    >();

    for (const row of recentFailures) {
      const key = row.user || row.user_email_snapshot || row.ip_address || 'unknown';
      const existing = grouped.get(key);
      if (existing) {
        existing.failureCount += 1;
        if (row.timestamp > existing.lastAttempt) {
          existing.lastAttempt = row.timestamp;
          existing.lastIp = row.ip_address ?? existing.lastIp;
        }
      } else {
        grouped.set(key, {
          userId: row.user,
          userEmail: row.user_email_snapshot,
          failureCount: 1,
          lastAttempt: row.timestamp,
          lastIp: row.ip_address,
        });
      }
    }

    return Array.from(grouped.values())
      .filter(entry => entry.failureCount >= failureThreshold)
      .sort((a, b) => b.failureCount - a.failureCount);
  }

  // ------- Internal helpers -------

  private static toIpRuleRow(row: IpRule): IpRuleRow {
    return {
      ipRuleId: row.ip_rule_id,
      type: row.type,
      cidr: row.cidr,
      label: row.label,
      isActive: row.is_active,
      expiresAt: row.expires_at,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default SecurityService;
