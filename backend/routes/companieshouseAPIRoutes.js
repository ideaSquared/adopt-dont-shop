// Import necessary modules for creating an Express router and making HTTP requests.
import express from 'express';
import axios from 'axios';
import verifyCompanyIsValid from '../utils/verifyCompanyIsValid.js'; // A utility function to validate the company data against custom criteria.

// Create a new router instance for handling routes.
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
	// Extract the company number from the URL parameters.
	const { companyNumber } = req.params;
	// Define the base URL for the Companies House API endpoint.
	const baseUrl = 'https://api.company-information.service.gov.uk/company';
	// Construct the full URL by appending the company number to the base URL.
	const fullURL = `${baseUrl}/${companyNumber}`;

	try {
		// Retrieve the API key from environment variables and encode it for Basic Auth.
		const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
		const encodedApiKey = Buffer.from(`${apiKey}:`).toString('base64');
		const authHeader = `Basic ${encodedApiKey}`;

		// Make a GET request to the Companies House API with the Authorization header.
		const response = await axios.get(fullURL, {
			headers: {
				Authorization: authHeader,
			},
		});

		// Use the custom utility function to check if the company data meets the validation criteria.
		const isValid = verifyCompanyIsValid(response.data);

		if (!isValid) {
			// If the company does not meet the validation criteria, respond with a 400 status code and a message.
			return res.status(400).json({
				message: 'Company does not meet the validation criteria',
			});
		}

		// If the company is valid, respond with the fetched data and a success message.
		res.status(200).json({
			data: response.data,
			message: 'Successfully fetched and verified company details',
		});
	} catch (error) {
		// Handle errors from the Companies House API.
		if (error.response) {
			// Forward the HTTP status code from the Companies House API and respond with the error message.
			res
				.status(error.response.status)
				.json({ message: error.response.data.error });
		} else {
			// Handle network errors or other issues not related to the HTTP response.
			console.error('Error fetching company details:', error);
			res.status(503).json({ message: 'Service unavailable' });
		}
	}
});

// Export the router to make it available for use in the Express application.
export default router;
