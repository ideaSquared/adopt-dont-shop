// Import the mongoose library for defining schemas and interacting with MongoDB.
import mongoose from 'mongoose';

/**
 * Schema definition for the User model.
 *
 * This schema is structured to store information about users, including their name, email,
 * password, password reset token, and their role within the system (e.g., whether they are an administrator).
 */
const userSchema = new mongoose.Schema({
	// The user's first name. This field is not marked as required, allowing for flexibility in user registration.
	firstName: String,
	// The user's email address. This is required and must be unique to ensure each user can be uniquely identified by their email.
	email: { type: String, required: true, unique: true },
	// The user's password. This is required for authentication purposes.
	password: { type: String, required: true },
	emailVerified: { type: Boolean, default: false },
	verificationToken: String,
	// A token used for resetting the user's password. This field is optional and only populated when a user initiates a password reset.
	resetToken: String,
	// The expiration date for the password reset token. This is optional and used in conjunction with the resetToken to manage password resets securely.
	resetTokenExpiration: Date,
	// A boolean to force a password reset. This is optional and set by the system for example if there is a potential compromise.
	resetTokenForceFlag: Boolean,
	// A boolean indicating whether the user has administrative privileges. Defaults to false for most users.
	isAdmin: { type: Boolean, default: false },
});

// Export the User model, making it available for creating and querying user documents in the application.
// This model will interact with the 'users' collection in MongoDB.
export default mongoose.model('User', userSchema);
