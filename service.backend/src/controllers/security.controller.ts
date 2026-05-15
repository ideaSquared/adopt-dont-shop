import { Response } from 'express';
import SecurityService from '../services/security.service';
import { IpRuleType } from '../models/IpRule';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types/auth';

export class SecurityController {
  static async listSessions(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId, page, limit } = req.query;
      const result = await SecurityService.listSessions({
        userId: userId as string | undefined,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });
      return res.json({
        success: true,
        data: result.sessions,
        pagination: {
          page: result.page,
          limit: parseInt((limit as string) || '50', 10),
          total: result.total,
          pages: result.totalPages,
        },
      });
    } catch (error) {
      logger.error('Error listing sessions:', error);
      return res.status(500).json({
        error: 'Failed to list sessions',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async revokeSession(req: AuthenticatedRequest, res: Response) {
    try {
      const { sessionId } = req.params;
      const result = await SecurityService.revokeSession(sessionId, req.user!.userId);
      return res.json({ success: true, data: result });
    } catch (error) {
      if (error instanceof Error && error.message === 'Session not found') {
        return res.status(404).json({ error: error.message });
      }
      logger.error('Error revoking session:', error);
      return res.status(500).json({
        error: 'Failed to revoke session',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async revokeAllUserSessions(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;
      const count = await SecurityService.revokeAllUserSessions(userId, req.user!.userId);
      return res.json({ success: true, data: { revokedCount: count } });
    } catch (error) {
      logger.error('Error revoking user sessions:', error);
      return res.status(500).json({
        error: 'Failed to revoke sessions',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async listIpRules(_req: AuthenticatedRequest, res: Response) {
    try {
      const rules = await SecurityService.listIpRules();
      return res.json({ success: true, data: rules });
    } catch (error) {
      logger.error('Error listing IP rules:', error);
      return res.status(500).json({
        error: 'Failed to list IP rules',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async createIpRule(req: AuthenticatedRequest, res: Response) {
    try {
      const { type, cidr, label, expiresAt } = req.body as {
        type?: string;
        cidr?: string;
        label?: string;
        expiresAt?: string | null;
      };
      if (type !== IpRuleType.ALLOW && type !== IpRuleType.BLOCK) {
        return res.status(400).json({ error: 'type must be "allow" or "block"' });
      }
      if (!cidr || typeof cidr !== 'string') {
        return res.status(400).json({ error: 'cidr is required' });
      }
      const rule = await SecurityService.createIpRule({
        type,
        cidr,
        label: label ?? null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        actorId: req.user!.userId,
      });
      return res.status(201).json({ success: true, data: rule });
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid CIDR or IP address') {
        return res.status(400).json({ error: error.message });
      }
      logger.error('Error creating IP rule:', error);
      return res.status(500).json({
        error: 'Failed to create IP rule',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async deleteIpRule(req: AuthenticatedRequest, res: Response) {
    try {
      const { ipRuleId } = req.params;
      await SecurityService.deleteIpRule(ipRuleId, req.user!.userId);
      return res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message === 'IP rule not found') {
        return res.status(404).json({ error: error.message });
      }
      logger.error('Error deleting IP rule:', error);
      return res.status(500).json({
        error: 'Failed to delete IP rule',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async unlockAccount(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;
      const result = await SecurityService.unlockAccount(userId, req.user!.userId);
      return res.json({ success: true, data: result });
    } catch (error) {
      if (error instanceof Error && error.message === 'User not found') {
        return res.status(404).json({ error: error.message });
      }
      logger.error('Error unlocking account:', error);
      return res.status(500).json({
        error: 'Failed to unlock account',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async forceLockAccount(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;
      const { reason } = req.body as { reason?: string };
      await SecurityService.forceLockAccount(userId, req.user!.userId, reason ?? null);
      return res.json({ success: true });
    } catch (error) {
      if (error instanceof Error && error.message === 'User not found') {
        return res.status(404).json({ error: error.message });
      }
      logger.error('Error force-locking account:', error);
      return res.status(500).json({
        error: 'Failed to lock account',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async getLoginHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId, status, startDate, endDate, page, limit } = req.query;
      const result = await SecurityService.getLoginHistory({
        userId: userId as string | undefined,
        status: status as 'success' | 'failure' | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      });
      return res.json({
        success: true,
        data: result.entries,
        pagination: {
          page: result.page,
          limit: parseInt((limit as string) || '50', 10),
          total: result.total,
          pages: result.totalPages,
        },
      });
    } catch (error) {
      logger.error('Error fetching login history:', error);
      return res.status(500).json({
        error: 'Failed to fetch login history',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async getSuspiciousActivity(req: AuthenticatedRequest, res: Response) {
    try {
      const { failureThreshold, windowHours } = req.query;
      const data = await SecurityService.getSuspiciousActivity({
        failureThreshold: failureThreshold ? parseInt(failureThreshold as string, 10) : undefined,
        windowHours: windowHours ? parseInt(windowHours as string, 10) : undefined,
      });
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Error fetching suspicious activity:', error);
      return res.status(500).json({
        error: 'Failed to fetch suspicious activity',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export default SecurityController;
