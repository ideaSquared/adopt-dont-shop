/**
 * @fileoverview Centralized Swagger schema definitions for automatic JSDoc generation
 * This file contains reusable schema components that can be referenced in route JSDoc comments
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     # === COMMON SCHEMAS ===
 *     ApiResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Indicates if the request was successful
 *         message:
 *           type: string
 *           description: Human-readable message
 *         data:
 *           type: object
 *           description: Response data (varies by endpoint)
 *       required:
 *         - success
 *       example:
 *         success: true
 *         message: "Operation completed successfully"
 *         data: {}
 *
 *     PaginationMeta:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *           minimum: 1
 *           description: Current page number
 *         limit:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           description: Items per page
 *         total:
 *           type: integer
 *           minimum: 0
 *           description: Total number of items
 *         totalPages:
 *           type: integer
 *           minimum: 0
 *           description: Total number of pages
 *         hasNext:
 *           type: boolean
 *           description: Whether there are more pages
 *         hasPrev:
 *           type: boolean
 *           description: Whether there are previous pages
 *       required:
 *         - page
 *         - limit
 *         - total
 *         - totalPages
 *         - hasNext
 *         - hasPrev
 *
 *     PaginatedResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/ApiResponse'
 *         - type: object
 *           properties:
 *             pagination:
 *               $ref: '#/components/schemas/PaginationMeta'
 *
 *     # === USER SCHEMAS ===
 *     UserBase:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *           format: uuid
 *           description: Unique user identifier
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         firstName:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *           description: User's first name
 *         lastName:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *           description: User's last name
 *         phone:
 *           type: string
 *           pattern: '^[+]?[1-9]\d{1,14}$'
 *           description: User's phone number (E.164 format)
 *         userType:
 *           type: string
 *           enum: [ADOPTER, RESCUE_STAFF, ADMIN]
 *           description: Type of user account
 *         isEmailVerified:
 *           type: boolean
 *           description: Whether email is verified
 *         isPhoneVerified:
 *           type: boolean
 *           description: Whether phone is verified
 *         profilePicture:
 *           type: string
 *           format: uri
 *           description: URL to profile picture
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Account creation timestamp
 *         lastLoginAt:
 *           type: string
 *           format: date-time
 *           description: Last login timestamp
 *       required:
 *         - userId
 *         - email
 *         - firstName
 *         - lastName
 *         - userType
 *         - isEmailVerified
 *         - isPhoneVerified
 *         - createdAt
 *
 *     CreateUserRequest:
 *       type: object
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 8
 *           description: Must contain uppercase, lowercase, number, and special character
 *         firstName:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *         lastName:
 *           type: string
 *           minLength: 2
 *           maxLength: 50
 *         userType:
 *           type: string
 *           enum: [ADOPTER, RESCUE_STAFF, ADMIN]
 *         phone:
 *           type: string
 *           pattern: '^[+]?[1-9]\d{1,14}$'
 *       required:
 *         - email
 *         - password
 *         - firstName
 *         - lastName
 *         - userType
 *
 *     # === PET SCHEMAS ===
 *     Pet:
 *       type: object
 *       properties:
 *         petId:
 *           type: string
 *           format: uuid
 *           description: Unique pet identifier
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *           description: Pet's name
 *         type:
 *           type: string
 *           enum: [DOG, CAT, RABBIT, BIRD, OTHER]
 *           description: Type of pet
 *         breed:
 *           type: string
 *           maxLength: 100
 *           description: Pet's breed
 *         age:
 *           type: string
 *           enum: [PUPPY, YOUNG, ADULT, SENIOR]
 *           description: Age category
 *         ageYears:
 *           type: integer
 *           minimum: 0
 *           maximum: 30
 *           description: Age in years
 *         ageMonths:
 *           type: integer
 *           minimum: 0
 *           maximum: 11
 *           description: Additional months
 *         gender:
 *           type: string
 *           enum: [MALE, FEMALE, UNKNOWN]
 *           description: Pet's gender
 *         size:
 *           type: string
 *           enum: [SMALL, MEDIUM, LARGE, EXTRA_LARGE]
 *           description: Pet's size category
 *         weight:
 *           type: number
 *           minimum: 0
 *           description: Pet's weight in pounds
 *         color:
 *           type: string
 *           maxLength: 100
 *           description: Pet's color/markings
 *         shortDescription:
 *           type: string
 *           maxLength: 500
 *           description: Brief description for listings
 *         longDescription:
 *           type: string
 *           description: Detailed description
 *         adoptionStatus:
 *           type: string
 *           enum: [AVAILABLE, PENDING, ADOPTED, ON_HOLD, NOT_AVAILABLE]
 *           description: Current adoption status
 *         specialNeeds:
 *           type: boolean
 *           description: Whether pet has special needs
 *         specialNeedsDescription:
 *           type: string
 *           description: Details about special needs
 *         goodWithKids:
 *           type: boolean
 *           description: Whether pet is good with children
 *         goodWithDogs:
 *           type: boolean
 *           description: Whether pet is good with other dogs
 *         goodWithCats:
 *           type: boolean
 *           description: Whether pet is good with cats
 *         houseTrained:
 *           type: boolean
 *           description: Whether pet is house trained
 *         spayedNeutered:
 *           type: boolean
 *           description: Whether pet is spayed/neutered
 *         vaccinated:
 *           type: boolean
 *           description: Whether pet is up to date on vaccinations
 *         microchipped:
 *           type: boolean
 *           description: Whether pet is microchipped
 *         photos:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               photoId:
 *                 type: string
 *                 format: uuid
 *               url:
 *                 type: string
 *                 format: uri
 *               isPrimary:
 *                 type: boolean
 *               caption:
 *                 type: string
 *         rescue:
 *           type: object
 *           properties:
 *             rescueId:
 *               type: string
 *               format: uuid
 *             name:
 *               type: string
 *             location:
 *               type: string
 *         location:
 *           type: object
 *           properties:
 *             address:
 *               type: string
 *             city:
 *               type: string
 *             state:
 *               type: string
 *             zipCode:
 *               type: string
 *             latitude:
 *               type: number
 *             longitude:
 *               type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - petId
 *         - name
 *         - type
 *         - breed
 *         - age
 *         - gender
 *         - size
 *         - adoptionStatus
 *         - createdAt
 *         - updatedAt
 *
 *     CreatePetRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *         type:
 *           type: string
 *           enum: [DOG, CAT, RABBIT, BIRD, OTHER]
 *         breed:
 *           type: string
 *           maxLength: 100
 *         ageYears:
 *           type: integer
 *           minimum: 0
 *           maximum: 30
 *         ageMonths:
 *           type: integer
 *           minimum: 0
 *           maximum: 11
 *         gender:
 *           type: string
 *           enum: [MALE, FEMALE, UNKNOWN]
 *         size:
 *           type: string
 *           enum: [SMALL, MEDIUM, LARGE, EXTRA_LARGE]
 *         weight:
 *           type: number
 *           minimum: 0
 *         color:
 *           type: string
 *           maxLength: 100
 *         shortDescription:
 *           type: string
 *           minLength: 10
 *           maxLength: 500
 *         longDescription:
 *           type: string
 *         specialNeeds:
 *           type: boolean
 *           default: false
 *         specialNeedsDescription:
 *           type: string
 *         goodWithKids:
 *           type: boolean
 *         goodWithDogs:
 *           type: boolean
 *         goodWithCats:
 *           type: boolean
 *         houseTrained:
 *           type: boolean
 *         spayedNeutered:
 *           type: boolean
 *         vaccinated:
 *           type: boolean
 *         microchipped:
 *           type: boolean
 *       required:
 *         - name
 *         - type
 *         - breed
 *         - gender
 *         - size
 *
 *     # === AUTH SCHEMAS ===
 *     LoginRequest:
 *       type: object
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *           minLength: 8
 *       required:
 *         - email
 *         - password
 *       example:
 *         email: "user@example.com"
 *         password: "SecurePass123!"
 *
 *     AuthResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/ApiResponse'
 *         - type: object
 *           properties:
 *             data:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT access token
 *                 refreshToken:
 *                   type: string
 *                   description: JWT refresh token
 *                 user:
 *                   $ref: '#/components/schemas/UserBase'
 *                 expiresIn:
 *                   type: integer
 *                   description: Token expiration time in seconds
 *               required:
 *                 - token
 *                 - user
 *                 - expiresIn
 *
 *     # === APPLICATION SCHEMAS ===
 *     Application:
 *       type: object
 *       properties:
 *         applicationId:
 *           type: string
 *           format: uuid
 *         petId:
 *           type: string
 *           format: uuid
 *         adopterId:
 *           type: string
 *           format: uuid
 *         status:
 *           type: string
 *           enum: [SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, WITHDRAWN]
 *         submittedAt:
 *           type: string
 *           format: date-time
 *         reviewedAt:
 *           type: string
 *           format: date-time
 *         reviewedBy:
 *           type: string
 *           format: uuid
 *         notes:
 *           type: string
 *         answers:
 *           type: object
 *           additionalProperties: true
 *       required:
 *         - applicationId
 *         - petId
 *         - adopterId
 *         - status
 *         - submittedAt
 *
 *     # === RESCUE SCHEMAS ===
 *     Rescue:
 *       type: object
 *       properties:
 *         rescueId:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *         description:
 *           type: string
 *         website:
 *           type: string
 *           format: uri
 *         email:
 *           type: string
 *           format: email
 *         phone:
 *           type: string
 *         address:
 *           type: object
 *           properties:
 *             street:
 *               type: string
 *             city:
 *               type: string
 *             state:
 *               type: string
 *             zipCode:
 *               type: string
 *             latitude:
 *               type: number
 *             longitude:
 *               type: number
 *         isVerified:
 *           type: boolean
 *         logoUrl:
 *           type: string
 *           format: uri
 *         createdAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - rescueId
 *         - name
 *         - email
 *         - isVerified
 *         - createdAt
 *
 *     # === ERROR SCHEMAS ===
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: Error type/code
 *         message:
 *           type: string
 *           description: Human-readable error message
 *         details:
 *           type: object
 *           description: Additional error details
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: Error timestamp
 *       required:
 *         - error
 *         - message
 *       example:
 *         error: "VALIDATION_ERROR"
 *         message: "Invalid input data"
 *         timestamp: "2024-01-01T12:00:00Z"
 *
 *     ValidationError:
 *       allOf:
 *         - $ref: '#/components/schemas/Error'
 *         - type: object
 *           properties:
 *             details:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   field:
 *                     type: string
 *                     description: Field that failed validation
 *                   message:
 *                     type: string
 *                     description: Validation error message
 *                   value:
 *                     description: Invalid value provided
 *                 required:
 *                   - field
 *                   - message
 */

// Export types for TypeScript integration
export interface SwaggerSchema {
  [key: string]: unknown;
}

export const commonSchemas = {
  ApiResponse: 'ApiResponse',
  PaginatedResponse: 'PaginatedResponse',
  Error: 'Error',
  ValidationError: 'ValidationError',
} as const;

export const userSchemas = {
  UserBase: 'UserBase',
  CreateUserRequest: 'CreateUserRequest',
} as const;

export const petSchemas = {
  Pet: 'Pet',
  CreatePetRequest: 'CreatePetRequest',
} as const;

export const authSchemas = {
  LoginRequest: 'LoginRequest',
  AuthResponse: 'AuthResponse',
} as const;

export const applicationSchemas = {
  Application: 'Application',
} as const;

export const rescueSchemas = {
  Rescue: 'Rescue',
} as const;
