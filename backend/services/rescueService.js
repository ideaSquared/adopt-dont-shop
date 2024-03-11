import Rescue from '../models/Rescue.js'; // Adjust the path to your actual model file

/**
 * Checks if the provided reference number is unique.
 *
 * @param {String} referenceNumber The reference number to check.
 * @returns {Promise<Boolean>} Returns true if the reference number is unique, false otherwise.
 */
const isReferenceNumberUnique = async (referenceNumber) => {
	const existingDocument = await Rescue.findOne({
		referenceNumber,
	}).exec();
	return !existingDocument;
};

const rescueService = {
	isReferenceNumberUnique,
};

export default rescueService;
