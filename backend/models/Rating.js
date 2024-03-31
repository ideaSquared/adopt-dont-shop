// Import the mongoose library for schema definitions and database interactions.
import mongoose from 'mongoose';

// Destructure Schema from mongoose to avoid redundancy in referencing mongoose.Schema.
const { Schema } = mongoose;

/**
 * Schema definition for the Rating model.
 *
 * This schema represents ratings made by users towards various entities (e.g., pets, other users)
 * within the system. It supports flexible target types through the use of the `refPath` feature,
 * allowing ratings to be applied to multiple types of documents.
 */
const ratingSchema = new mongoose.Schema({
	// Reference to the User who made the rating. This establishes who is providing the rating.
	userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
	// Dynamic reference to the target of the rating. The actual model referred is determined by the `onModel` field.
	targetId: {
		type: Schema.Types.ObjectId,
		required: true,
		refPath: 'onModel', // Determines the model to use for the reference based on the value of the `onModel` field.
	},
	// The type of the target being rated. This field supports the system's flexibility by allowing different kinds of rating targets.
	targetType: { type: String, required: true, enum: ['Pet', 'User'] },
	// The source of the rating, indicating whether the rating was given by a rescue organization or another user.
	ratingSource: { type: String, required: true, enum: ['Rescue', 'User'] },
	// The type of the rating. Defaults to 'like' but can be extended to support various types of ratings.
	ratingType: {
		type: String,
		required: true,
		default: 'like',
		enum: ['like', 'love', 'dislike'],
	},
	// This field specifies the model on which the `targetId` is referencing, allowing for dynamic references.
	onModel: {
		type: String,
		required: true,
		enum: ['Pet', 'User'], // Enum restricts the model to either 'Pet' or 'User', corresponding to the `targetType` field.
	},
});

// Export the Rating model, making it available for CRUD operations and queries in the application.
// This model interacts with the 'ratings' collection in MongoDB.
export default mongoose.model('Rating', ratingSchema);
