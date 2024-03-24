import axios from 'axios';
import verifyCompanyIsValid from './verifyCompanyIsValid.js'; // Adjust the import path as needed

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
		throw new Error(
			'COMPANIES_HOUSE_API_KEY is not defined in environment variables.'
		);
	}

	const encodedApiKey = Buffer.from(`${apiKey}:`).toString('base64');
	const authHeader = `Basic ${encodedApiKey}`;

	try {
		const response = await axios.get(fullURL, {
			headers: { Authorization: authHeader },
		});

		const isValid = verifyCompanyIsValid(response.data);

		if (!isValid) {
			throw new Error(
				`Company ${companyNumber} does not meet validation criteria.`
			);
		}

		return {
			data: response.data,
			message: 'Successfully fetched and verified company details',
		};
	} catch (error) {
		// Re-throw the error to be handled by the caller
		throw error;
	}
}

export default fetchAndValidateCompany;
