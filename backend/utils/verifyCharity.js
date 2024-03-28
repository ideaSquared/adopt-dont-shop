import axios from 'axios';
import Sentry from '@sentry/node'; // Sentry for error tracking
import LoggerUtil from '../utils/Logger.js'; // Custom logger utility

import verifyCharityIsValid from './verifyCharityIsValid.js';

// Instantiate a logger for this module
const logger = new LoggerUtil('fetchAndValidateCharity').getLogger();

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
		logger.info(
			`Fetching charity details for registration number: ${registeredNumber}`
		);
		const response = await axios.get(fullURL, {
			headers: {
				'Cache-Control': 'no-cache',
				'Ocp-Apim-Subscription-Key': process.env.CHARITY_COMMISSION_API_KEY,
			},
		});

		if (response.status === 200) {
			const isValid = verifyCharityIsValid(response.data);
			logger.info(
				`Charity validation result for ${registeredNumber}: ${isValid}`
			);
			return isValid; // Returns true if the charity data is valid, false otherwise
		} else {
			throw new Error(`Unexpected response status: ${response.status}`);
		}
	} catch (error) {
		logger.error(
			`Error in fetching/validating charity for registration number ${registeredNumber}: ${error.message}`
		);
		Sentry.captureException(error); // Report the error to Sentry
		throw error; // Re-throw the error to be handled by the caller
	}
}

export default fetchAndValidateCharity;
