// Import necessary modules for creating an Express router and making HTTP requests.
import express from 'express';
import axios from 'axios';
import verifyCompanyIsValid from '../utils/verifyCompanyIsValid.js'; // Utility function for validating company data.
import Sentry from '@sentry/node'; // Error tracking utility.
import LoggerUtil from '../utils/Logger.js'; // Logging utility.

// Instantiate the logger for this particular module.
const logger = new LoggerUtil('company-api-wrapper').getLogger();

// Create a new Express router instance for defining API routes.
const router = express.Router();

/**
 * Route handler for fetching company information from the UK's Companies House API by its registration number.
 * It constructs a request to the API using the company registration number provided in the URL parameters.
 * Basic authentication is used, requiring an API key stored in environment variables.
 *
 * The response from the Companies House API is validated using a custom utility function to ensure it meets specific criteria.
 * If the company data is valid, it responds with a 200 status code, including the company data and a success message.
 * If the company data does not meet the validation criteria, it responds with a 400 status code and a message indicating the issue.
 *
 * The route handles errors gracefully, including forwarding HTTP errors from the Companies House API, and handles network or other unexpected errors by responding with a 503 Service Unavailable status.
 *
 * @param {string} companyNumber - The company registration number as provided in the URL parameters.
 * @returns JSON response with either the company information and a success message, an error message with an appropriate status code, or a service unavailable message in case of network issues or unexpected errors.
 */
router.get('/:companyNumber', async (req, res) => {
	// Extract the company registration number from the request's URL parameters.
	const { companyNumber } = req.params;

	// Log the start of a request to fetch information for a specific company number.
	logger.info(
		`Fetching company information for company number: ${companyNumber}`
	);

	// Define the base URL for the Companies House API endpoint.
	const baseUrl = 'https://api.company-information.service.gov.uk/company';
	// Construct the full URL for the API request by appending the company number to the base URL.
	const fullURL = `${baseUrl}/${companyNumber}`;

	try {
		// Retrieve the API key from environment variables. This key is required for authentication with the API.
		const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
		// If the API key is not set, log an error and return a 500 Internal Server Error response.
		if (!apiKey) {
			logger.error(
				'COMPANIES_HOUSE_API_KEY is not defined in environment variables.'
			);
			return res
				.status(500)
				.json({ message: 'Internal server error due to missing API key' });
		}
		// Encode the API key for Basic Authentication.
		const encodedApiKey = Buffer.from(`${apiKey}:`).toString('base64');
		const authHeader = `Basic ${encodedApiKey}`;

		// Make a GET request to the Companies House API with the necessary Authorization header.
		const response = await axios.get(fullURL, {
			headers: { Authorization: authHeader },
		});

		// Use a custom utility function to validate the fetched company data against specific criteria.
		const isValid = verifyCompanyIsValid(response.data);

		// If the company data does not meet the validation criteria, log a warning and return a 400 Bad Request response.
		if (!isValid) {
			logger.warn(
				`Company ${companyNumber} does not meet validation criteria.`
			);
			return res.status(400).json({
				message: 'Company does not meet the validation criteria',
			});
		}

		// If the company is valid, log success and return the fetched data along with a 200 OK response.
		logger.info(
			`Company ${companyNumber} is valid and information was successfully fetched.`
		);
		res.status(200).json({
			data: response.data,
			message: 'Successfully fetched and verified company details',
		});
	} catch (error) {
		// Handle errors that occur during the API request.
		if (error.response) {
			// If the error is from the Companies House API, log it, report to Sentry, and forward the API's status code and error message.
			logger.error(
				`HTTP error fetching company ${companyNumber}: ${error.message}`,
				{ statusCode: error.response.status }
			);
			Sentry.captureException(error);
			res.status(error.response.status).json({
				message: error.response.data.error || 'Error fetching company data',
			});
		} else {
			// For network errors or other unexpected issues, log the error, report to Sentry, and return a 503 Service Unavailable response.
			logger.error(
				`Network or unexpected error fetching company ${companyNumber}: ${error.message}`
			);
			Sentry.captureException(error);
			res.status(503).json({ message: 'Service unavailable' });
		}
	}
});

// Export the router to make it available for use in the Express application.
export default router;
