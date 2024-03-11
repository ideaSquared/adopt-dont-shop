// Rescue.js
import mongoose from 'mongoose';
const { Schema } = mongoose; // Destructure Schema from mongoose

const rescueStaffSchema = new Schema({
	userId: {
		type: Schema.Types.ObjectId,
		ref: 'User', // Assuming 'User' is the name of your User schema/model
	},
	permissions: {
		type: [String],
		enum: [
			'edit_rescue_info',
			'add_pet',
			'delete_pet',
			'edit_pet',
			'see_messages',
			'send_messages',
		],
	},
	verifiedByRescue: {
		type: Boolean,
		default: false,
	},
});

const rescueSchema = new Schema({
	rescueName: {
		type: String,
		required: false,
	},
	rescueAddress: {
		type: String,
		required: false,
	},
	rescueType: {
		type: String,
		enum: ['Individual', 'Charity', 'Company'],
		required: true,
	},
	referenceNumber: {
		type: String,
		required: false,
	},
	referenceNumberVerified: {
		type: Boolean,
		default: false,
	},
	staff: {
		type: [rescueStaffSchema], // Array of rescue staff
		default: [],
	},
});

export default mongoose.model('Rescue', rescueSchema);
