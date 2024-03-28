import axios from 'axios';
import Sentry from '@sentry/node'; // Sentry for error tracking
import LoggerUtil from '../utils/Logger.js'; // Custom logger utility

import verifyCompanyIsValid from './verifyCompanyIsValid.js'; // Adjust the import path as needed

// Instantiate a logger for this module, assuming LoggerUtil is correctly set up to handle this.
const logger = new LoggerUtil('utils/verify-company').getLogger();

/**
 * Fetches and validates company information from the UK's Companies House API.
 *
 * @param {string} companyNumber The company registration number to query.
 * @returns {Promise<object>} The company information if valid and an error message if not valid or an error occurs.
 * @throws {Error} Throws an error if an API key is not provided, the request fails, or the company data does not meet validation criteria.
 */
async function fetchAndValidateCompany(companyNumber) {
	const baseUrl = 'https://api.company-information.service.gov.uk/company';
	const fullURL = `${baseUrl}/${companyNumber}`;
	const apiKey = process.env.COMPANIES_HOUSE_API_KEY;

	if (!apiKey) {
		logger.error(
			'COMPANIES_HOUSE_API_KEY is not defined in environment variables.'
		);
		throw new Error(
			'COMPANIES_HOUSE_API_KEY is not defined in environment variables.'
		);
	}

	const encodedApiKey = Buffer.from(`${apiKey}:`).toString('base64');
	const authHeader = `Basic ${encodedApiKey}`;

	console.log(fullURL);

	try {
		logger.info(
			`Fetching company details for company number: ${companyNumber}`
		);
		const response = await axios.get(fullURL, {
			headers: { Authorization: authHeader },
		});

		const isValid = verifyCompanyIsValid(response.data);

		if (!isValid) {
			logger.warn(
				`Company ${companyNumber} does not meet validation criteria.`
			);
			return false;
		}

		logger.info(
			`Successfully fetched and verified company details for company number: ${companyNumber}`
		);
		return {
			data: response.data,
			message: 'Successfully fetched and verified company details',
		};
	} catch (error) {
		logger.error(`Error in fetching/validating company: ${error.message}`);
		Sentry.captureException(error); // Report the error to Sentry
		return false;
	}
}

export default fetchAndValidateCompany;
