import { Op, type WhereOptions } from 'sequelize';
import sequelize from '../sequelize';
import Pet, { PetStatus } from '../models/Pet';
import FosterPlacement, {
  FosterPlacementStatus,
  type FosterPlacementAttributes,
} from '../models/FosterPlacement';
import PetStatusTransition from '../models/PetStatusTransition';
import { logger } from '../utils/logger';

export type CreatePlacementInput = {
  petId: string;
  fosterUserId: string;
  rescueId: string;
  startDate: Date;
  notes?: string;
};

export type EndPlacementInput = {
  outcome: 'return_to_rescue' | 'adopted_by_foster' | 'cancelled';
  endDate?: Date;
  notes?: string;
};

export type ListPlacementsFilter = {
  rescueId?: string;
  fosterUserId?: string;
  status?: FosterPlacementStatus;
};

class FosterService {
  async createPlacement(
    input: CreatePlacementInput,
    actorUserId: string | null
  ): Promise<FosterPlacementAttributes> {
    return sequelize.transaction(async t => {
      const pet = await Pet.findByPk(input.petId, { transaction: t });
      if (!pet) {
        throw new Error('Pet not found');
      }
      if (pet.rescueId !== input.rescueId) {
        throw new Error('Pet does not belong to the specified rescue');
      }

      const existing = await FosterPlacement.findOne({
        where: { petId: input.petId, status: FosterPlacementStatus.ACTIVE },
        transaction: t,
      });
      if (existing) {
        throw new Error('Pet already has an active foster placement');
      }

      const placement = await FosterPlacement.create(
        {
          petId: input.petId,
          fosterUserId: input.fosterUserId,
          rescueId: input.rescueId,
          startDate: input.startDate,
          notes: input.notes ?? null,
          status: FosterPlacementStatus.ACTIVE,
        },
        { transaction: t }
      );

      await PetStatusTransition.create(
        {
          petId: input.petId,
          fromStatus: pet.status,
          toStatus: PetStatus.FOSTER,
          transitionedBy: actorUserId,
          reason: 'Foster placement created',
          metadata: { placementId: placement.placementId },
        },
        { transaction: t }
      );

      return placement.get({ plain: true });
    });
  }

  async endPlacement(
    placementId: string,
    input: EndPlacementInput,
    actorUserId: string | null
  ): Promise<FosterPlacementAttributes> {
    return sequelize.transaction(async t => {
      const placement = await FosterPlacement.findByPk(placementId, { transaction: t });
      if (!placement) {
        throw new Error('Placement not found');
      }
      if (placement.status !== FosterPlacementStatus.ACTIVE) {
        throw new Error('Placement is not active');
      }

      const newStatus =
        input.outcome === 'cancelled'
          ? FosterPlacementStatus.CANCELLED
          : FosterPlacementStatus.COMPLETED;

      placement.status = newStatus;
      placement.endDate = input.endDate ?? new Date();
      if (input.notes) {
        placement.notes = placement.notes ? `${placement.notes}\n${input.notes}` : input.notes;
      }
      await placement.save({ transaction: t });

      // Transition pet back to available, or to adopted if adopted by foster.
      const pet = await Pet.findByPk(placement.petId, { transaction: t });
      if (pet) {
        const nextStatus =
          input.outcome === 'adopted_by_foster' ? PetStatus.ADOPTED : PetStatus.AVAILABLE;
        await PetStatusTransition.create(
          {
            petId: placement.petId,
            fromStatus: pet.status,
            toStatus: nextStatus,
            transitionedBy: actorUserId,
            reason: `Foster placement ended (${input.outcome})`,
            metadata: { placementId: placement.placementId },
          },
          { transaction: t }
        );
      }

      return placement.get({ plain: true });
    });
  }

  async list(filter: ListPlacementsFilter): Promise<FosterPlacementAttributes[]> {
    const where: WhereOptions<FosterPlacementAttributes> = {};
    if (filter.rescueId) {
      where.rescueId = filter.rescueId;
    }
    if (filter.fosterUserId) {
      where.fosterUserId = filter.fosterUserId;
    }
    if (filter.status) {
      where.status = filter.status;
    }
    const placements = await FosterPlacement.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });
    return placements.map(p => p.get({ plain: true }));
  }

  async getById(placementId: string): Promise<FosterPlacementAttributes | null> {
    const placement = await FosterPlacement.findByPk(placementId);
    return placement ? placement.get({ plain: true }) : null;
  }
}

export const fosterService = new FosterService();
export default fosterService;
