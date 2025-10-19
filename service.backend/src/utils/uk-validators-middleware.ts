/**
 * Express-validator custom validators for UK data
 */
import { CustomValidator } from 'express-validator';
import { validateUKPostcode, validateUKPhoneNumber } from './uk-validators';

/**
 * Custom validator for UK postcodes
 */
export const isUKPostcode: CustomValidator = (value) => {
  if (!value) {
    return true; // Allow optional, use .notEmpty() for required
  }
  return validateUKPostcode(value);
};

/**
 * Custom validator for UK phone numbers
 */
export const isUKPhoneNumber: CustomValidator = (value) => {
  if (!value) {
    return true; // Allow optional, use .notEmpty() for required
  }
  return validateUKPhoneNumber(value);
};
