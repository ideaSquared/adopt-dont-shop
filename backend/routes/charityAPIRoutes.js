// Import necessary modules.
import express from 'express'; // For routing.
import axios from 'axios'; // For making HTTP requests.
import verifyCharityIsValid from '../utils/verifyCharityIsValid.js'; // Custom utility function for validating charity data.

import Sentry from '@sentry/node'; // Assuming Sentry is already imported and initialized elsewhere
import LoggerUtil from '../utils/Logger.js';
const logger = new LoggerUtil('charity-api-wrapper').getLogger();

// Create a new router instance.
const router = express.Router();

/**
 * Route handler for fetching charity information from the UK's Charity Commission API by its registered number.
 * It constructs a request to the API using the charity registration number provided in the URL parameters.
 * The response from the Charity Commission API is validated using a custom utility function to ensure it meets specific criteria.
 *
 * If the charity data is valid, it responds with a 200 status code, including the charity data and a success message.
 * If the charity data does not meet the validation criteria, it responds with a 400 status code and a message indicating the issue.
 *
 * The route handles errors gracefully, including forwarding HTTP errors from the Charity Commission API, and handles network or other unexpected errors by responding with a 503 Service Unavailable status.
 *
 * @param {string} registeredNumber - The charity registration number as provided in the URL parameters.
 * @returns JSON response with either the charity information and a success message, an error message with an appropriate status code, or a service unavailable message in case of network issues or unexpected errors.
 */
router.get('/:registeredNumber', async (req, res) => {
	// Extract the registered number from the request parameters.
	const { registeredNumber } = req.params;

	// Log the initiation of a request to fetch charity information
	logger.info(
		`Fetching charity information for registered number: ${registeredNumber}`
	);

	// Define the API endpoint components
	const apiSuffix = '0';
	const baseUrl =
		'https://api.charitycommission.gov.uk/register/api/allcharitydetailsV2';
	const fullURL = `${baseUrl}/${registeredNumber}/${apiSuffix}`;

	try {
		// Perform the API request
		const response = await axios.get(fullURL, {
			headers: {
				'Cache-Control': 'no-cache',
				'Ocp-Apim-Subscription-Key': process.env.CHARITY_COMMISSION_API_KEY,
			},
		});

		// Check if the response status is 200 (OK)
		if (response.status === 200) {
			// Validate the charity data using the custom utility function
			const isValid = verifyCharityIsValid(response.data);
			if (isValid) {
				// Log successful validation
				logger.info(`Charity ${registeredNumber} passed validation.`);
				// Respond with the charity data
				res.status(200).json({
					data: response.data,
					message: 'Successfully fetched and verified charity details',
				});
			} else {
				// Log failed validation
				logger.warn(
					`Charity ${registeredNumber} did not meet validation criteria.`
				);
				// Respond with a validation error message
				res
					.status(400)
					.json({ message: 'Charity does not meet the validation criteria' });
			}
		} else {
			// Log unexpected API response status
			logger.error(
				`Unexpected response status: ${response.status} for charity ${registeredNumber}`
			);
			Sentry.captureException(
				new Error(`Unexpected response status: ${response.status}`)
			);
			// Respond with an error message indicating an unexpected error
			res
				.status(response.status)
				.json({ message: 'Unexpected error occurred' });
		}
	} catch (error) {
		if (error.response) {
			// Assuming you want to customize the message based on the status code
			let errorMessage;
			switch (error.response.status) {
				case 404:
					errorMessage = 'No charity found with the provided reference number';
					break;
				case 401:
					errorMessage = 'Unauthorized access to the Charity Commission API';
					break;
				default:
					errorMessage = 'Unexpected error occurred'; // Default message
			}

			// Log API response errors with a custom message
			logger.error(
				`HTTP error fetching charity ${registeredNumber}: ${errorMessage}`,
				{ statusCode: error.response.status }
			);
			Sentry.captureException(new Error(errorMessage));
			// Respond with the custom error message
			res.status(error.response.status).json({ message: errorMessage });
		} else {
			// Handle network errors or other issues not related to the HTTP response
			const networkErrorMessage =
				'Service unavailable due to network error or unexpected issue';
			logger.error(
				`Network or unexpected error fetching charity ${registeredNumber}: ${networkErrorMessage}`
			);
			Sentry.captureException(new Error(networkErrorMessage));
			res.status(503).json({ message: networkErrorMessage });
		}
	}
});

// Export the router to make it available for use in the Express application.
export default router;
