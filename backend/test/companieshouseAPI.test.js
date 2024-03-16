// companieshouseAPI.test.js
import request from 'supertest';
import { expect } from 'chai';
import app from '../index.js'; // Ensure this is the correct path to your Express app

describe('Comapny House API tests', () => {
	let originalApiKey;

	const validCompanyHouseNumber = process.env.VALID_COMPANY_HOUSE_NUMBER;
	const invalidCompanyHouseNumber = process.env.INVALID_COMPANY_HOUSE_NUMBER;
	const nonExistentCompanyHouseNumber = '00000000'; // Assumed to be invalid

	before(() => {
		// Save the original API key
		originalApiKey = process.env.COMPANIES_HOUSE_API_KEY;
	});

	after(() => {
		// Restore the original API key
		process.env.COMPANIES_HOUSE_API_KEY = originalApiKey;
	});

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

		it('should return false for a invalid company with valid company reference', async () => {
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
			// Temporarily set an invalid API key for this test
			process.env.COMPANIES_HOUSE_API_KEY = 'invalid_api_key';

			const response = await request(app).get(
				`/api/companieshouse/${validCompanyHouseNumber}`
			);

			// Reset or reconfigure your API key if necessary

			expect(response.statusCode).to.equal(401);
		});
	});
});
