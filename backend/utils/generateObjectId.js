const { ObjectId } = require('mongodb');

/**
 * Generates a new MongoDB ObjectId.
 * @returns {ObjectId} A new ObjectId.
 */
export function generateObjectId() {
	return new ObjectId();
}
