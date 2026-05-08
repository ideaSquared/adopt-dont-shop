import { vi } from 'vitest';
import { Response } from 'express';
import { PetController } from '../../controllers/pet.controller';
import { UserType } from '../../models/User';
import PetService from '../../services/pet.service';
import { AuthenticatedRequest } from '../../types';

// ADS-489: rescue-membership lookups moved from direct StaffMember.findAll
// calls in the controller into PetService methods. These tests now mock the
// service shim instead of the model.
vi.mock('../../services/pet.service', () => ({
  default: {
    createPet: vi.fn(),
    getVerifiedRescueIdForUser: vi.fn(),
    getVerifiedRescueIdsForUser: vi.fn(),
  },
}));
vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));
vi.mock('express-validator', () => ({
  validationResult: () => ({ isEmpty: () => true, array: () => [] }),
}));

// ADS-527: vi.mocked() recovers the typed mock without manually-cast
// shapes. The vi.mock() factory above declares which methods are mocked;
// vi.mocked() infers the rest from the mocked module type.
const MockedPetService = vi.mocked(PetService);

describe('PetController.createPet — rescueId resolution [ADS-376]', () => {
  let controller: PetController;
  let req: Partial<AuthenticatedRequest>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new PetController();
    req = {
      user: {
        userId: 'user-1',
        email: 'staff@example.com',
        userType: UserType.RESCUE_STAFF,
        firstName: 'Staff',
        lastName: 'Member',
      } as AuthenticatedRequest['user'],
      body: { name: 'Buddy' },
      query: {},
    };
    res = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };
    MockedPetService.createPet.mockResolvedValue({ petId: 'pet-1', name: 'Buddy' });
  });

  it('uses the single verified rescue implicitly when the user belongs to one rescue', async () => {
    MockedPetService.getVerifiedRescueIdsForUser.mockResolvedValueOnce(['rescue-A']);

    await controller.createPet(req as AuthenticatedRequest, res as Response);

    expect(MockedPetService.createPet).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Buddy' }),
      'rescue-A',
      'user-1'
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('returns 400 when the user is verified at multiple rescues and no selector is provided', async () => {
    MockedPetService.getVerifiedRescueIdsForUser.mockResolvedValueOnce(['rescue-A', 'rescue-B']);

    await controller.createPet(req as AuthenticatedRequest, res as Response);

    expect(MockedPetService.createPet).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        rescueIds: ['rescue-A', 'rescue-B'],
      })
    );
  });

  it('uses the explicit ?rescueId when the user is verified at multiple rescues and the id matches one', async () => {
    MockedPetService.getVerifiedRescueIdsForUser.mockResolvedValueOnce(['rescue-A', 'rescue-B']);
    req.query = { rescueId: 'rescue-B' };

    await controller.createPet(req as AuthenticatedRequest, res as Response);

    expect(MockedPetService.createPet).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Buddy' }),
      'rescue-B',
      'user-1'
    );
  });

  it('returns 403 when ?rescueId points at a rescue the user is not verified staff at', async () => {
    MockedPetService.getVerifiedRescueIdsForUser.mockResolvedValueOnce(['rescue-A']);
    req.query = { rescueId: 'rescue-Z' };

    await controller.createPet(req as AuthenticatedRequest, res as Response);

    expect(MockedPetService.createPet).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 403 when the user has no verified rescue association', async () => {
    MockedPetService.getVerifiedRescueIdsForUser.mockResolvedValueOnce([]);

    await controller.createPet(req as AuthenticatedRequest, res as Response);

    expect(MockedPetService.createPet).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
