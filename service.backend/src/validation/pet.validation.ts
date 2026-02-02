import { param } from 'express-validator';

export const petValidation = {
  getPetsByRescue: [
    param('rescueId')
      .isUUID()
      .withMessage('Rescue ID must be a valid UUID'),
  ],
};
