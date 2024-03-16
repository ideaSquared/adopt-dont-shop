// companieshouseAPI.test.js
import request from 'supertest';
import { expect } from 'chai';
import app from '../index.js'; // Ensure this is the correct path to your Express app

describe.only('Comapny House API tests', () => {
	let originalApiKey;

	before(() => {
		// Save the original API key
		originalApiKey = process.env.COMPANIES_HOUSE_API_KEY;
	});

	after(() => {
		// Restore the original API key
		process.env.COMPANIES_HOUSE_API_KEY = originalApiKey;
	});

	describe('GET /companieshouse/:companyNumber', () => {
		const validCompanyNumber = '05045773';

		it('should return company details for a valid company number', async () => {
			const response = await request(app).get(
				`/api/companieshouse/${validCompanyNumber}`
			);

			expect(response.statusCode).to.equal(200);
			expect(response.body).to.have.property('data');
			expect(response.body.data).to.be.an('object');
			expect(response.body.message).to.equal(
				'Successfully fetched company details'
			);
		});
		it('should return a 404 status for a non-existent company number', async () => {
			const invalidCompanyNumber = '00000000'; // Assumed to be invalid
			const response = await request(app).get(
				`/api/companieshouse/${invalidCompanyNumber}`
			);

			expect(response.statusCode).to.equal(404);
		});
		it('should return a 401 status for requests with an invalid API key', async () => {
			// Temporarily set an invalid API key for this test
			process.env.COMPANIES_HOUSE_API_KEY = 'invalid_api_key';

			const response = await request(app).get(
				`/api/companieshouse/${validCompanyNumber}`
			);

			// Reset or reconfigure your API key if necessary

			expect(response.statusCode).to.equal(401);
		});
	});
});
