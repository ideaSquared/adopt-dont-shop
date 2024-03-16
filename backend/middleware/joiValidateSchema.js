// joiValidateSchema.js
import Joi from 'joi';

// Schema with sanitization for registration
const registerSchema = Joi.object({
	email: Joi.string().email().lowercase().trim().required(),
	password: Joi.string().min(6).trim().required(),
	firstName: Joi.string().trim().min(3).max(30).required(),
});

// Schema with sanitization for login
const loginSchema = Joi.object({
	email: Joi.string().email().lowercase().trim().required(),
	password: Joi.string().trim().required(),
});

// Schema with sanitization for updating user details
const updateDetailsSchema = Joi.object({
	email: Joi.string().email().lowercase().trim(),
	password: Joi.string().min(6).trim(),
	firstName: Joi.string().trim().min(3).max(30),
}).min(1); // Ensure at least one field is provided

// Validation schema for reset password
const resetPasswordSchema = Joi.object({
	token: Joi.string().required(),
	newPassword: Joi.string().min(6).required(),
});

// Validation schema for forgot password
const forgotPasswordSchema = Joi.object({
	email: Joi.string().email().lowercase().trim().required(),
});

// Validation schema for admin-specific actions
const adminResetPasswordSchema = Joi.object({
	password: Joi.string().min(6).required(),
});

const rescueStaffJoiSchema = Joi.object({
	userId: Joi.string().required(), // Assuming MongoDB ObjectId is passed as a string
	permissions: Joi.array().items(
		Joi.string().valid(
			'edit_rescue_info',
			'add_pet',
			'delete_pet',
			'edit_pet',
			'see_messages',
			'send_messages'
		)
	),
	verifiedByRescue: Joi.boolean(),
});

const rescueJoiSchema = Joi.object({
	rescueName: Joi.string().allow(''), // Allows an empty string, assuming required: false means it can be empty
	rescueAddress: Joi.string().allow(''),
	rescueType: Joi.string().valid('Individual', 'Charity', 'Company').required(),
	referenceNumber: Joi.string().allow(''),
	referenceNumberVerified: Joi.boolean(),
	staff: Joi.array().items(rescueStaffJoiSchema), // Validates each staff member with the defined Joi schema
});

// Utility function to validate request body against a schema
const validateRequest = (schema) => (req, res, next) => {
	const { error, value } = schema.validate(req.body, {
		abortEarly: false,
		stripUnknown: true,
	});
	if (error) {
		res
			.status(400)
			.json({ message: error.details.map((x) => x.message).join(', ') });
	} else {
		req.body = value; // Override req.body with sanitized values
		next();
	}
};

export {
	registerSchema,
	loginSchema,
	updateDetailsSchema,
	resetPasswordSchema,
	forgotPasswordSchema,
	adminResetPasswordSchema,
	rescueStaffJoiSchema,
	validateRequest,
	rescueJoiSchema,
};
