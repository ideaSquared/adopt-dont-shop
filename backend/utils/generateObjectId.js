import mongoose from 'mongodb';

/**
 * Generates a new MongoDB ObjectId using Mongoose.
 * @returns {mongoose.Types.ObjectId} A new ObjectId.
 */
const generateObjectId = () => new mongoose.Types.ObjectId();

export { generateObjectId };
