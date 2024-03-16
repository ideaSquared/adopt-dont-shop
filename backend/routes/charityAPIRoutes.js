import express from 'express';
import axios from 'axios';
import verifyCharityIsValid from '../utils/verifyCharityIsValid.js';

const router = express.Router();

// https://register-of-charities.charitycommission.gov.uk/

router.get('/:registeredNumber', async (req, res) => {
	const { registeredNumber } = req.params;

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

		// Assuming the API returns 200 for found charities and 404 for not found
		if (response.status === 200) {
			// Use the utility function to validate the charity data
			const isValid = verifyCharityIsValid(response.data);

			if (isValid) {
				res.status(200).json({
					data: response.data,
					message: 'Successfully fetched and verified charity details',
				});
			} else {
				res
					.status(400)
					.json({ message: 'Charity does not meet the validation criteria' });
			}
		} else {
			// Handle unexpected statuses
			console.error('Unexpected response status:', response.status);
			res
				.status(response.status)
				.json({ message: 'Unexpected error occurred' });
		}
	} catch (error) {
		if (error.response) {
			// Handle errors from the Charity Commission API
			if (error.response.status === 404) {
				res.status(404).json({
					message: 'No charity found with the provided reference number',
				});
			} else if (error.response.status === 401) {
				res.status(401).json({
					message: 'Unauthorized access to the Charity Commission API',
				});
			} else {
				// Handle other HTTP errors
				res.status(error.response.status).json({ message: error.message });
			}
		} else {
			// Handle network errors or other Axios errors
			console.error('Error fetching charity details:', error);
			res.status(503).json({ message: 'Service unavailable' });
		}
	}
});

export default router;
