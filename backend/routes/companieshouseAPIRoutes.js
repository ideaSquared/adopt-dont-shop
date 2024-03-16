import express from 'express';
import axios from 'axios';

const router = express.Router();

router.get('/:companyNumber', async (req, res) => {
	const { companyNumber } = req.params;
	const baseUrl = 'https://api.company-information.service.gov.uk/company';
	const fullURL = `${baseUrl}/${companyNumber}`;

	try {
		const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
		const encodedApiKey = Buffer.from(`${apiKey}:`).toString('base64');
		const authHeader = `Basic ${encodedApiKey}`;

		const response = await axios.get(fullURL, {
			headers: {
				Authorization: authHeader,
			},
		});

		res.status(200).json({
			data: response.data,
			message: 'Successfully fetched company details',
		});
	} catch (error) {
		if (error.response) {
			// Handle common HTTP errors by forwarding the status code from the Companies House API
			res
				.status(error.response.status)
				.json({ message: error.response.data.error });
		} else {
			// Handle network errors or other Axios errors
			console.error('Error fetching company details:', error);
			res.status(503).json({ message: 'Service unavailable' });
		}
	}
});

export default router;
