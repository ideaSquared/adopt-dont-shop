// charityAPIRoutes.test.js
import request from 'supertest';
import { expect } from 'chai';
import app from '../index.js'; // Ensure this is the correct path to your Express app

describe('Charity Register API tests', () => {
	let originalApiKey;

	before(() => {
		// Save the original API key
		originalApiKey = process.env.CHARITY_COMMISSION_API_KEY;
	});

	after(() => {
		// Restore the original API key
		process.env.CHARITY_COMMISSION_API_KEY = originalApiKey;
	});

	describe('GET /api/charityregister/:registeredNumber', function () {
		this.timeout(5000);

		it('should return charityregister details for a valid reference number', async () => {
			const validReference = '1190812';
			const res = await request(app).get(
				`/api/charityregister/${validReference}`
			);

			expect(res.statusCode).to.equal(200);
			expect(res.body).to.not.be.empty;
			expect(res.body).to.be.an('object');
		});

		it('should return a 404 status for a non-existent charityregister reference number', async () => {
			const invalidReference = '0000000'; // Assuming this is an invalid reference number
			const res = await request(app).get(
				`/api/charityregister/${invalidReference}`
			);

			expect(res.statusCode).to.equal(404);
			expect(res.body)
				.to.have.property('message')
				.that.includes('No charity found with the provided reference number');
		});

		it('should return a 401 status for requests without a valid API key', async () => {
			after(() => {
				// Restore the original API key
				process.env.CHARITY_COMMISSION_API_KEY = originalApiKey;
			});

			process.env.CHARITY_COMMISSION_API_KEY = 'invalid_test_key';
			// This test requires you to modify your route handler to simulate an unauthorized access scenario.
			const validReference = '1190812';
			const res = await request(app).get(
				`/api/charityregister/${validReference}`
			);

			// Assuming the test environment doesn't include a valid API key
			expect(res.statusCode).to.equal(401);
			expect(res.body)
				.to.have.property('message')
				.that.includes('Unauthorized');
		});
	});
});

/*
    TEST CASES:
    1. Verify the API returns the data required (name/active)
    2. Verify it is a valid reference number (find the specification for the ref no)
    3. Verify if the API goes down, that it returns this error
    */
