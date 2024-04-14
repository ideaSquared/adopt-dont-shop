// Import the Joi package for data validation.
import Joi from 'joi';
import LoggerUtil from '../utils/Logger.js';
const logger = new LoggerUtil('joi-validation-service').getLogger();

/**
 * Joi schema for user registration. It enforces validation and sanitization rules
 * for the email, password, and firstName fields to ensure they meet specific criteria
 * before allowing a user to be registered.
 */
const registerSchema = Joi.object({
	// Validate the email address, ensuring it is a valid email, converted to lowercase, trimmed, and required.
	email: Joi.string().email().lowercase().trim().required(),
	// Validate the password, ensuring it has a minimum length of 6 characters, trimmed, and required.
	password: Joi.string().min(6).trim().required(),
	// Validate the firstName, ensuring it is a string, trimmed, has a minimum length of 3 characters, a maximum of 30 characters, and is required.
	firstName: Joi.string().trim().min(3).max(30).required(),
});

/**
 * Joi schema for user login. It enforces validation and sanitization rules
 * for the email and password fields to ensure they meet specific criteria
 * for logging in a user.
 */
const loginSchema = Joi.object({
	email: Joi.string().email().lowercase().trim().required(),
	password: Joi.string().trim().required(),
});

/**
 * Joi schema for updating user details. It allows optional updates to email, password,
 * and firstName, enforcing validation and sanitization rules on them. At least one field
 * must be provided for the update operation to proceed.
 */
const updateDetailsSchema = Joi.object({
	email: Joi.string().email().lowercase().trim(),
	password: Joi.string().min(6).trim().allow(null, ''),
	firstName: Joi.string().trim().min(3).max(30),
}).min(1); // Ensure at least one field is provided for the update.

/**
 * Joi schema for resetting a user's password. It requires a token (for verifying the user's identity)
 * and a new password, enforcing validation rules on the new password.
 */
const resetPasswordSchema = Joi.object({
	token: Joi.string().required(),
	newPassword: Joi.string().min(6).required(),
});

/**
 * Joi schema for initiating a password reset process (forgot password). It requires
 * the user's email address to send them a password reset link.
 */
const forgotPasswordSchema = Joi.object({
	email: Joi.string().email().lowercase().trim().required(),
});

/**
 * !!! DEPRECIATED: No longer sending password
 * Joi schema for admin-initiated password reset actions. It requires a new password,
 * enforcing validation rules on the password.
 */
// const adminResetPasswordSchema = Joi.object({
// 	password: Joi.string().min(6).required(),
// });

/**
 * Joi schema for defining rescue staff details, including their userId, permissions, and verification status.
 * It validates the userId as a required string and permissions as an array of predefined strings.
 */
const rescueStaffJoiSchema = Joi.object({
	userId: Joi.string().required(), // Assuming MongoDB ObjectId is passed as a string
	permissions: Joi.array().items(
		Joi.string().valid(
			'edit_rescue_info',
			'view_rescue_info',
			'delete_rescue',
			'add_staff',
			'edit_staff',
			'verify_staff',
			'delete_staff',
			'view_staff',
			'view_pet',
			'add_pet',
			'edit_pet',
			'delete_pet',
			'create_messages',
			'view_messages'
		)
	),
	verifiedByRescue: Joi.boolean(),
});

/**
 * Joi schema for defining rescue organization details, including name, address, type, and staff members.
 * It validates each field with specific rules and ensures that the staff array contains valid rescue staff objects.
 */
const rescueJoiSchema = Joi.object({
	rescueName: Joi.string().allow(''), // Allows an empty string, assuming required: false means it can be empty
	rescueAddress: Joi.string().allow(''),
	rescueType: Joi.string().valid('Individual', 'Charity', 'Company').required(),
	referenceNumber: Joi.string().allow(''),
	referenceNumberVerified: Joi.boolean(),
	staff: Joi.array().items(rescueStaffJoiSchema), // Validates each staff member with the defined Joi schema
});

// Joi schema for adding/updating pet details
const petJoiSchema = Joi.object({
	name: Joi.string().required(),
	ownerId: Joi.number().required().min(1),
	short_description: Joi.string().required(),
	long_description: Joi.string().required(),
	age: Joi.number().required(),
	gender: Joi.string().required().valid('Male', 'Female', 'Other', 'Unknown'), // Adjust valid options as needed
	status: Joi.string().required(), // You might want to validate against specific status options
	type: Joi.string().required(),
	images: Joi.array().items(Joi.string()), // Validate as an array of strings (URLs)
	characteristics: Joi.object({
		common: Joi.object({
			vaccination_status: Joi.string().required(),
			temperament: Joi.string().required(),
			size: Joi.string().required(),
		}),
		specific: Joi.object({
			breed: Joi.string().required(),
			activity_level: Joi.string().required(),
			intelligence_level: Joi.string().required(),
		}),
	}),
	archived: Joi.boolean(),
});

const participantReferenceValidationSchema = Joi.object({
	// participantId: Joi.number().required().messages({
	// 	'string.base': `"participantId" should be a string`,
	// 	'any.required': `"participantId" is a required field`,
	// }),
	// participantType: Joi.number().required().valid('User', 'Rescue').messages({
	// 	'string.base': `"participantType" should be a string`,
	// 	'any.required': `"participantType" is a required field`,
	// 	'any.only': `"participantType" must be one of [User, Rescue]`,
	// }),
});

const conversationSchema = Joi.object({
	participants: Joi.array()
		.items(participantReferenceValidationSchema)
		.min(2)
		.required()
		.messages({
			'array.base': `"participants" should be an array`,
			'array.min': `"participants" should have at least 2 participants`,
		}),
	startedBy: Joi.string().required(),
	startedAt: Joi.date().required(),
	lastMessage: Joi.string().allow('', null),
	lastMessageAt: Joi.date().allow(null),
	lastMessageBy: Joi.string().required(),
	status: Joi.string().valid('active', 'closed').required(),
	unreadMessages: Joi.number().integer().min(0).required(),
	messagesCount: Joi.number().integer().min(0).required(),
});

const createConversationSchema = Joi.object({
	participants: Joi.array()
		.items(participantReferenceValidationSchema)
		.min(2)
		.required()
		.messages({
			'array.base': `"participants" should be an array`,
			'array.min': `"participants" should have at least 2 participants`,
		}),
	petId: Joi.number().optional(), // Change this line accordingly
});

const messageSchema = Joi.object({
	conversationId: Joi.number().required(),
	senderId: Joi.number().required(),
	messageText: Joi.string().required(),
	sentAt: Joi.date().required(),
	readAt: Joi.date().allow(null),
	attachments: Joi.array()
		.items(
			Joi.object({
				type: Joi.string().required(), // Since "type" is a reserved keyword in JavaScript, ensure proper handling if implementing custom validation logic
				url: Joi.string().required(),
				description: Joi.string().allow('', null),
			})
		)
		.optional()
		.default([]), // Assume attachments are optional and default to an empty array if not provided
	status: Joi.string().valid('sent', 'delivered', 'read').required(),
});

const ratingSchema = Joi.object({
	userId: Joi.number().required(), // Assuming userId is sent as a string
	petId: Joi.number().required(), // Renamed targetId to petId for clarity
	ratingType: Joi.string().required().valid('like', 'love', 'dislike'),
});

/**
 * Utility function for validating the request body against a given Joi schema.
 * It applies the schema to the request body, returning a 400 status code with a detailed message if validation fails,
 * or sanitizing and replacing req.body with validated values if validation succeeds.
 *
 * @param {Joi.Schema} schema - The Joi validation schema to apply to the request body.
 * @returns {Function} - An Express middleware function that validates and sanitizes the request body.
 */
const validateRequest = (schema) => (req, res, next) => {
	// Log the incoming request for validation
	logger.debug(`Validating request for ${req.path}`);

	const { error, value } = schema.validate(req.body, {
		abortEarly: false, // Report all errors, not just the first one
		stripUnknown: true, // Remove unknown keys from the validated data
	});

	if (error) {
		// Log the validation error
		logger.warn(
			`Validation error for request to ${req.path}: ${error.details
				.map((x) => x.message)
				.join(', ')}`
		);

		// Respond with a 400 status code and a detailed error message if validation fails.
		res
			.status(400)
			.json({ message: error.details.map((x) => x.message).join(', ') });
	} else {
		// Log successful validation
		logger.debug(`Validation successful for request to ${req.path}`);

		req.body = value; // Override req.body with sanitized values
		next();
	}
};

// Export the schemas and utility function to make them available for use in other parts of the application.
export {
	registerSchema,
	loginSchema,
	updateDetailsSchema,
	resetPasswordSchema,
	forgotPasswordSchema,
	rescueStaffJoiSchema,
	petJoiSchema,
	conversationSchema,
	createConversationSchema,
	messageSchema,
	ratingSchema,
	validateRequest,
	rescueJoiSchema,
};
