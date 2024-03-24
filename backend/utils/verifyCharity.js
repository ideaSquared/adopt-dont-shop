// Import necessary modules
import axios from 'axios'; // For making HTTP requests
import verifyCharityIsValid from './verifyCharityIsValid.js'; // Custom utility function for validating charity data

/**
 * Utility function to fetch and validate charity information from the UK's Charity Commission API.
 *
 * @param {string} registeredNumber The charity registration number.
 * @returns {Promise<boolean>} True if the charity information is valid, false otherwise.
 * @throws {Error} Throws an error if the API request fails or if an unexpected status is received.
 */
async function fetchAndValidateCharity(registeredNumber) {
	const apiSuffix = '0';
	const baseUrl =
		'https://api.charitycommission.gov.uk/register/api/allcharitydetailsV2';
	const fullURL = `${baseUrl}/${registeredNumber}/${apiSuffix}`;

	try {
		const response = await axios.get(fullURL, {
			headers: {
				'Cache-Control': 'no-cache',
				'Ocp-Apim-Subscription-Key': process.env.CHARITY_COMMISSION_API_KEY,
			},
		});

		if (response.status === 200) {
			const isValid = verifyCharityIsValid(response.data);
			return isValid; // Returns true if the charity data is valid, false otherwise
		} else {
			throw new Error(`Unexpected response status: ${response.status}`);
		}
	} catch (error) {
		// You can either handle the error here or throw it to be handled by the caller
		throw error;
	}
}

export default fetchAndValidateCharity;
