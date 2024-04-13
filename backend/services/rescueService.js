import { pool } from '../dbConnection.js';

/**
 * Asynchronously checks the uniqueness of a reference number within the Rescue collection.
 *
 * This function queries the database for a document with the specified reference number by leveraging
 * the Mongoose model for the Rescue collection. The aim is to ensure that reference numbers, which are
 * meant to be unique identifiers for rescue organizations, do not get duplicated in the database.
 * This is crucial for maintaining the integrity of the data, especially in systems where the reference number
 * might be used to fetch or associate related data.
 *
 * @param {String} referenceNumber - The reference number to be checked for uniqueness. This is expected to
 * be a string that potentially corresponds to an existing document in the Rescue collection.
 *
 * @returns {Promise<Boolean>} - A promise that resolves to true if the reference number is not found in any
 * document within the Rescue collection, indicating that it is unique. If a document with the given reference
 * number already exists, the promise resolves to false, indicating the reference number is not unique.
 *
 * The function uses the `findOne` method on the Rescue model, searching for any document with a matching
 * reference number. If no document is found (`existingDocument` is null), the function returns true,
 * otherwise, it returns false. This makes it easy to prevent the creation or updating of rescue documents
 * with duplicate reference numbers, thereby enforcing the uniqueness constraint.
 */

const isReferenceNumberUnique = async (referenceNumber) => {
	try {
		// Query the PostgreSQL database to check if the reference number exists
		const result = await pool.query(
			'SELECT * FROM rescues WHERE reference_number = $1',
			[referenceNumber]
		);

		// If no rows are returned, the reference number is unique
		return result.rows.length === 0;
	} catch (error) {
		// Handle any errors
		console.error('Error checking reference number uniqueness:', error);
		return false;
	}
};
const rescueService = {
	isReferenceNumberUnique,
};

export default rescueService;
