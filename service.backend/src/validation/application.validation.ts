import { param } from 'express-validator';

export const applicationValidation = {
  getFormStructure: [
    param('rescueId')
      .isUUID()
      .withMessage('Rescue ID must be a valid UUID'),
  ],

  validateAnswers: [
    param('rescueId')
      .isUUID()
      .withMessage('Rescue ID must be a valid UUID'),
  ],
};
