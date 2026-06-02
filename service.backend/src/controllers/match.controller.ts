import { Response } from 'express';
import { body, query } from 'express-validator';
import { sendValidationErrors } from '../middleware/validation';
import { matchService } from '../matching';
import AdopterMatchProfile from '../models/AdopterMatchProfile';
import Breed from '../models/Breed';
import Pet, { PetStatus } from '../models/Pet';
import PetMedia, { PetMediaType } from '../models/PetMedia';
import Rescue from '../models/Rescue';
import { AuthenticatedRequest } from '../types/auth';
import { logger } from '../utils/logger';
import { parsePaginationLimit } from '../utils/pagination';

/**
 * Defense-in-depth caps for the top-picks endpoint. The route-level
 * express-validator declares the same bounds; these constants ensure
 * the service layer still receives a bounded `limit` if that validator
 * is ever removed or misconfigured.
 */
const TOP_PICKS_DEFAULT_LIMIT = 10;
const TOP_PICKS_MAX_LIMIT = 50;

/**
 * Match controller — exposes the matching module to clients:
 *   GET  /api/v1/match/profile      — current user's match profile
 *   PUT  /api/v1/match/profile      — upsert match profile (onboarding wizard)
 *   GET  /api/v1/match/top-picks    — ranked, scored pets for the user
 *
 * When MATCH_ENABLED=false the top-picks endpoint returns an empty
 * array — the client surfaces a "matching not enabled" empty state
 * instead of legacy random sort. Discovery endpoint remains the
 * always-on browse path.
 */

const PROFILE_FIELDS = [
  'preferred_types',
  'preferred_sizes',
  'preferred_age_groups',
  'preferred_energy',
  'preferred_temperament',
  'lifestyle',
  'max_distance_km',
  'open_to_special_needs',
  'notify_new_matches',
  'min_notification_score',
  'allergies',
] as const;

export class MatchController {
  static validateUpsertProfile = [
    body('preferred_types').optional().isArray(),
    body('preferred_sizes').optional().isArray(),
    body('preferred_age_groups').optional().isArray(),
    body('preferred_energy').optional().isArray(),
    body('preferred_temperament').optional().isArray(),
    body('lifestyle').optional().isObject(),
    body('max_distance_km').optional().isInt({ min: 1, max: 50000 }),
    body('open_to_special_needs').optional().isBoolean(),
    body('notify_new_matches').optional().isBoolean(),
    body('min_notification_score').optional().isInt({ min: 0, max: 100 }),
    body('allergies').optional({ values: 'null' }).isString(),
  ];

  static validateTopPicks = [query('limit').optional().isInt({ min: 1, max: 50 })];

  static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const profile = await AdopterMatchProfile.findByPk(userId);
    res.status(200).json({
      success: true,
      data: profile ?? { user_id: userId, lifestyle: {}, inferred_prefs: {} },
    });
  }

  static async upsertProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (sendValidationErrors(req, res)) {
      return;
    }

    const userId = req.user!.userId;
    const payload: Record<string, unknown> = { user_id: userId, prefs_updated_at: new Date() };
    for (const field of PROFILE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        payload[field] = req.body[field];
      }
    }

    const [profile] = await AdopterMatchProfile.upsert(
      payload as unknown as AdopterMatchProfile['_creationAttributes']
    );

    res.status(200).json({ success: true, data: profile });
  }

  static async getTopPicks(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (sendValidationErrors(req, res)) {
      return;
    }

    const userId = req.user!.userId;
    const limit = parsePaginationLimit(req.query.limit as string | undefined, {
      default: TOP_PICKS_DEFAULT_LIMIT,
      max: TOP_PICKS_MAX_LIMIT,
    });

    if (!matchService.isEnabled()) {
      res.status(200).json({ success: true, data: [], message: 'matching disabled' });
      return;
    }

    try {
      // Candidate set: available pets, capped at 5x limit to keep
      // scoring bounded. Eager-load media + breed + rescue so the
      // response can render without follow-up queries.
      const candidates = await Pet.findAll({
        where: { status: PetStatus.AVAILABLE },
        include: [
          { model: Rescue, as: 'Rescue', attributes: ['rescue_id', 'name', 'status'] },
          {
            model: PetMedia,
            as: 'Media',
            where: { type: PetMediaType.IMAGE },
            required: false,
          },
          { model: Breed, as: 'Breed', attributes: ['breed_id', 'name'], required: false },
        ],
        limit: limit * 5,
        order: [['created_at', 'DESC']],
      });

      const scored = await matchService.rankPets(userId, candidates);
      const scoreById = new Map(scored.map(s => [s.petId, s]));
      const top = candidates
        .map(pet => {
          const s = scoreById.get(pet.petId);
          return { pet, score: s?.score ?? 0, reasons: s?.reasons ?? [] };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      res.status(200).json({
        success: true,
        data: top.map(({ pet, score, reasons }) => {
          const media = (pet as Pet & { Media?: PetMedia[] }).Media ?? [];
          const primaryImage =
            media.find(m => m.is_primary) ??
            [...media].sort((a, b) => a.order_index - b.order_index)[0];
          return {
            petId: pet.petId,
            name: pet.name,
            type: pet.type,
            ageGroup: pet.ageGroup,
            size: pet.size,
            score,
            reasons,
            rescueName:
              (pet as Pet & { Rescue?: { name: string } }).Rescue?.name ?? 'Unknown Rescue',
            breedName: (pet as Pet & { Breed?: { name: string } }).Breed?.name ?? null,
            photoUrl: primaryImage?.thumbnail_url ?? primaryImage?.url ?? null,
          };
        }),
      });
    } catch (err) {
      logger.error('match.top-picks failed', {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
      res.status(500).json({ success: false, message: 'Failed to load top picks' });
    }
  }
}
