import { type Response } from 'express';
import { validationResult } from 'express-validator';
import fosterService from '../services/foster.service';
import { FosterPlacementStatus } from '../models/FosterPlacement';
import { UserType } from '../models/User';
import type { AuthenticatedRequest } from '../types/auth';

const ADMIN_USER_TYPES = [UserType.ADMIN, UserType.SUPER_ADMIN];

export class FosterController {
  private static isAdmin(req: AuthenticatedRequest): boolean {
    const role = req.user?.userType as UserType | undefined;
    return role !== undefined && ADMIN_USER_TYPES.includes(role);
  }

  private static rescueScopeOrAdmin(req: AuthenticatedRequest, rescueId: string): boolean {
    if (FosterController.isAdmin(req)) {
      return true;
    }
    return req.user?.rescueId === rescueId;
  }

  static async createPlacement(req: AuthenticatedRequest, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    if (!FosterController.rescueScopeOrAdmin(req, req.body.rescueId)) {
      return res.status(403).json({ error: 'Cannot create placements for this rescue' });
    }
    const placement = await fosterService.createPlacement(
      {
        petId: req.body.petId,
        fosterUserId: req.body.fosterUserId,
        rescueId: req.body.rescueId,
        startDate: new Date(req.body.startDate),
        notes: req.body.notes,
      },
      req.user!.userId
    );
    return res.status(201).json({ data: placement });
  }

  static async listPlacements(req: AuthenticatedRequest, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    if (!FosterController.isAdmin(req) && !req.user?.rescueId) {
      return res.status(403).json({ error: 'No rescue scope' });
    }
    const scopedRescueId = FosterController.isAdmin(req)
      ? (req.query.rescueId as string | undefined)
      : (req.user?.rescueId ?? undefined);

    const parseQueryInt = (value: unknown): number | undefined => {
      if (typeof value !== 'string') {
        return undefined;
      }
      const parsed = parseInt(value, 10);
      return Number.isNaN(parsed) ? undefined : parsed;
    };

    const placements = await fosterService.list({
      rescueId: scopedRescueId,
      fosterUserId: req.query.fosterUserId as string | undefined,
      status: req.query.status as FosterPlacementStatus | undefined,
      limit: parseQueryInt(req.query.limit),
      offset: parseQueryInt(req.query.offset),
    });
    return res.json({ data: placements });
  }

  static async getPlacement(req: AuthenticatedRequest, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const placement = await fosterService.getById(req.params.id);
    if (!placement) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (!FosterController.rescueScopeOrAdmin(req, placement.rescueId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return res.json({ data: placement });
  }

  static async endPlacement(req: AuthenticatedRequest, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const existing = await fosterService.getById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (!FosterController.rescueScopeOrAdmin(req, existing.rescueId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const placement = await fosterService.endPlacement(
      req.params.id,
      {
        outcome: req.body.outcome,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
        notes: req.body.notes,
      },
      req.user!.userId
    );
    return res.json({ data: placement });
  }
}
