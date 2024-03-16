import request from 'supertest';
import { expect } from 'chai';
import app from '../index.js'; // Ensure this path correctly points to your Express app

/**
 * Test suite for Company House API interactions.
 *
 * This suite verifies the application's ability to query the Company House API and validate company numbers.
 * It tests the response to valid and invalid company numbers, checks for non-existent numbers, and assesses
 * the handling of unauthorized API requests.
 */
describe('Company House API tests', () => {
	let originalApiKey;

	// Define company numbers for testing
	const validCompanyHouseNumber = process.env.VALID_COMPANY_HOUSE_NUMBER;
	const invalidCompanyHouseNumber = process.env.INVALID_COMPANY_HOUSE_NUMBER;
	const nonExistentCompanyHouseNumber = '00000000'; // Assumed to be invalid for testing

	before(() => {
		// Save the original API key before any modifications
		originalApiKey = process.env.COMPANIES_HOUSE_API_KEY;
	});

	after(() => {
		// Restore the original API key after tests are complete
		process.env.COMPANIES_HOUSE_API_KEY = originalApiKey;
	});

	/**
	 * Tests the Company House API endpoint with various company numbers.
	 */
	describe('GET /companieshouse/:companyNumber', () => {
		it('should return true for a valid company with valid company reference', async () => {
			const response = await request(app).get(
				`/api/companieshouse/${validCompanyHouseNumber}`
			);

			expect(response.statusCode).to.equal(200);
			expect(response.body).to.have.property('data');
			expect(response.body.data).to.be.an('object');
			expect(response.body.message).to.equal(
				'Successfully fetched and verified company details'
			);
		});

		it('should return false for an invalid company with valid company reference', async () => {
			const response = await request(app).get(
				`/api/companieshouse/${invalidCompanyHouseNumber}`
			);

			expect(response.statusCode).to.equal(400);
			expect(response.body.message).to.equal(
				'Company does not meet the validation criteria'
			);
		});

		it('should return a 404 status for a non-existent company number', async () => {
			const response = await request(app).get(
				`/api/companieshouse/${nonExistentCompanyHouseNumber}`
			);

			expect(response.statusCode).to.equal(404);
		});

		it('should return a 401 status for requests with an invalid API key', async () => {
			process.env.COMPANIES_HOUSE_API_KEY = 'invalid_api_key';

			const response = await request(app).get(
				`/api/companieshouse/${validCompanyHouseNumber}`
			);

			expect(response.statusCode).to.equal(401);
		});
	});
});
