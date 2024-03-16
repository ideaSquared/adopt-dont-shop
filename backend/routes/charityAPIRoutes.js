// Import necessary modules.
import express from 'express'; // For routing.
import axios from 'axios'; // For making HTTP requests.
import verifyCharityIsValid from '../utils/verifyCharityIsValid.js'; // Custom utility function for validating charity data.

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
	// Destructure the registered number from the request parameters.
	const { registeredNumber } = req.params;

	// API endpoint suffix, as required by the Charity Commission API format.
	const apiSuffix = '0';
	// Base URL for the Charity Commission API.
	const baseUrl =
		'https://api.charitycommission.gov.uk/register/api/allcharitydetailsV2';
	// Construct the full URL by combining the base URL, registered number, and suffix.
	const fullURL = `${baseUrl}/${registeredNumber}/${apiSuffix}`;

	try {
		// Make a GET request to the Charity Commission API with necessary headers.
		const response = await axios.get(fullURL, {
			headers: {
				'Cache-Control': 'no-cache', // Ensures the response is not cached for up-to-date information.
				'Ocp-Apim-Subscription-Key': process.env.CHARITY_COMMISSION_API_KEY, // Subscription key for API access.
			},
		});

		// If the API returns a 200 status, proceed to validate the charity data.
		if (response.status === 200) {
			// Use the custom utility function to validate the charity data.
			const isValid = verifyCharityIsValid(response.data);

			// If the charity is valid according to custom criteria, respond with the charity data.
			if (isValid) {
				res.status(200).json({
					data: response.data,
					message: 'Successfully fetched and verified charity details',
				});
			} else {
				// If the charity does not meet the validation criteria, respond with an error.
				res
					.status(400)
					.json({ message: 'Charity does not meet the validation criteria' });
			}
		} else {
			// Log and handle unexpected response statuses.
			console.error('Unexpected response status:', response.status);
			res
				.status(response.status)
				.json({ message: 'Unexpected error occurred' });
		}
	} catch (error) {
		// Handle errors from the Charity Commission API.
		if (error.response) {
			// Specific handling for common HTTP status codes such as 404 (Not Found) or 401 (Unauthorized).
			if (error.response.status === 404) {
				res.status(404).json({
					message: 'No charity found with the provided reference number',
				});
			} else if (error.response.status === 401) {
				res.status(401).json({
					message: 'Unauthorized access to the Charity Commission API',
				});
			} else {
				// Handle other HTTP errors with the status code and message from the response.
				res.status(error.response.status).json({ message: error.message });
			}
		} else {
			// Handle network errors or other issues not related to the HTTP response.
			console.error('Error fetching charity details:', error);
			res.status(503).json({ message: 'Service unavailable' });
		}
	}
});

// Export the router to make it available for use in the Express application.
export default router;
