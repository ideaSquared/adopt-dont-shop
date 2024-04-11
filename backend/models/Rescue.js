// Import the mongoose library for creating schemas and interacting with MongoDB.
import mongoose from 'mongoose';

// Destructure the Schema constructor from mongoose to simplify the schema creation syntax.
const { Schema } = mongoose;

/**
 * Schema definition for individual staff members within a rescue organization.
 *
 * This schema includes details about the staff member's user ID, their permissions within the rescue,
 * and whether they have been verified by the rescue organization.
 */
const rescueStaffSchema = new Schema({
	// Reference to the User document representing the staff member. This establishes a link between the staff member and their user profile.
	userId: {
		type: Schema.Types.ObjectId,
		ref: 'User', // Assumes 'User' is the name of the schema/model representing users.
	},
	// An array of permissions granted to the staff member. This defines what actions the staff member is allowed to perform within the rescue context.
	permissions: {
		type: [String],
		enum: [
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
			'view_messages',
		],
	},
	// A Boolean indicating whether the staff member has been verified by the rescue organization.
	verifiedByRescue: {
		type: Boolean,
		default: false, // Defaults to false until explicitly verified by the rescue.
	},
});

/**
 * Main schema definition for the Rescue model.
 *
 * This schema represents rescue organizations, including their name, address, type, and staff members,
 * as well as a reference number for additional verification or identification purposes.
 */
const rescueSchema = new Schema(
	{
		// The name of the rescue organization. This field is not strictly required.
		rescueName: {
			type: String,
			required: false,
		},
		// The address of the rescue organization. This field is also not strictly required.
		rescueAddress: {
			type: String,
			required: false,
		},
		// The type of rescue organization, which is required and must be one of the predefined values.
		rescueType: {
			type: String,
			enum: ['Individual', 'Charity', 'Company'], // Restricts the type of the rescue to specific categories.
			required: true,
		},
		// An optional reference number for the rescue organization. This could be used for verification or registration purposes.
		referenceNumber: {
			type: String,
			required: false,
		},
		// A Boolean indicating whether the rescue's reference number has been verified.
		referenceNumberVerified: {
			type: Boolean,
			default: false, // Defaults to false until the number is verified.
		},
		// An array of staff members associated with the rescue, defined by the rescueStaffSchema.
		staff: {
			type: [rescueStaffSchema], // Allows for multiple staff members to be associated with a single rescue.
			default: [], // Defaults to an empty array if no staff members are specified.
		},
	},
	{ timestamps: true }
);

// Export the Rescue model, making it available for CRUD operations and queries.
// This model will interact with the 'rescues' collection in MongoDB.
export default mongoose.model('Rescue', rescueSchema);
