// Import the mongoose library to define schemas and interact with MongoDB.
import mongoose from 'mongoose';

// Destructure Schema from mongoose to simplify the schema definition syntax.
const { Schema } = mongoose;

/**
 * Schema definition for the Pet model.
 *
 * This schema is structured to store detailed information about pets, including their names,
 * descriptions, physical and behavioral characteristics, and status. It is designed to be
 * used by rescue organizations or similar entities to manage pet records.
 */
const petSchema = new mongoose.Schema({
	// The name of the pet. This field is required for every pet document.
	petName: { type: String, required: true },
	// Reference to the Rescue entity that owns or is responsible for the pet. It is required to associate pets with a specific rescue or owner.
	ownerId: { type: Schema.Types.ObjectId, required: true, ref: 'Rescue' },
	// A short description of the pet. Required for providing a brief overview.
	shortDescription: { type: String, required: true },
	// A detailed description of the pet. Required for providing comprehensive information about the pet.
	longDescription: { type: String, required: true },
	// The age of the pet in years. This field is required.
	age: { type: Number, required: true },
	// The gender of the pet. This field is required and could be values like 'Male', 'Female', etc.
	gender: { type: String, required: true },
	// The current status of the pet (e.g., available for adoption, fostered, etc.). This field is required to manage the pet's adoption status.
	status: { type: String, required: true },
	// An array of image URLs for the pet. This allows for multiple images per pet but is not required.
	images: [{ type: String }],
	// Nested object containing characteristics of the pet. It includes both common traits and specific traits.
	characteristics: {
		common: {
			vaccination_status: { type: String, required: true }, // Vaccination status of the pet, required for health tracking.
			temperament: { type: String, required: true }, // The general temperament of the pet, required for matching with suitable adopters.
			size: { type: String, required: true }, // The size category of the pet, required for adopters' expectations.
		},
		specific: {
			breed: { type: String, required: true }, // The breed of the pet, required for identification and match purposes.
			activity_level: { type: String, required: true }, // The pet's activity level, important for matching with an adopter's lifestyle.
			intelligence_level: { type: String, required: true }, // The intelligence level of the pet, which may affect training and care requirements.
		},
	},
	// Indicates whether the pet is archived. This is required and defaults to false. Useful for hiding pets from active listings without deleting.
	archived: { type: Boolean, required: true, default: false },
});

// Export the Pet model, making it available for CRUD operations and queries.
// This model will interact with the 'pets' collection in MongoDB.
export default mongoose.model('Pet', petSchema);
