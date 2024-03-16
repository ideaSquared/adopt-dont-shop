import request from 'supertest';
import { expect } from 'chai';
import app from '../index.js'; // Ensure this path correctly points to your Express app

/**
 * Test suite for Charity Register API interactions.
 *
 * This suite checks the API's ability to validate charity registration numbers, handling both valid and invalid cases.
 * It tests the application's response to valid charity numbers, removed or invalid charity numbers, non-existent numbers,
 * and unauthorized access scenarios.
 */
describe('Charity Register API tests', () => {
	let originalApiKey;

	// Pre-defined charity registration numbers for testing purposes
	const validCharityRegisterNumber = process.env.VALID_CHARITY_REGISTER_NUMBER;
	const invalidCharityRegisterNumber =
		process.env.INVALID_CHARITY_REGISTER_NUMBER;
	const nonExistentCharityRegisterNumber = '0000000'; // Assumed to be invalid for testing

	before(() => {
		// Save the original API key before tests modify it
		originalApiKey = process.env.CHARITY_COMMISSION_API_KEY;
	});

	after(() => {
		// Restore the original API key after tests have completed
		process.env.CHARITY_COMMISSION_API_KEY = originalApiKey;
	});

	/**
	 * Tests the charity validation endpoint with various charity registration numbers.
	 */
	describe('GET /api/charityregister/:registeredNumber', function () {
		this.timeout(5000); // Extends default timeout for external API calls

		it('should return true if the charity is validated with a valid reference number', async () => {
			const res = await request(app).get(
				`/api/charityregister/${validCharityRegisterNumber}`
			);

			expect(res.statusCode).to.equal(200);
			expect(res.body).to.not.be.empty;
			expect(res.body).to.be.an('object');
		});

		it('should return false if the charity is validated with a removed charity with a valid reference number', async () => {
			const res = await request(app).get(
				`/api/charityregister/${invalidCharityRegisterNumber}`
			);

			expect(res.statusCode).to.equal(400);
			expect(res.body)
				.to.have.property('message')
				.that.includes('Charity does not meet the validation criteria');
		});

		it('should return a 404 status for a non-existent charity register reference number', async () => {
			const res = await request(app).get(
				`/api/charityregister/${nonExistentCharityRegisterNumber}`
			);

			expect(res.statusCode).to.equal(404);
			expect(res.body)
				.to.have.property('message')
				.that.includes('No charity found with the provided reference number');
		});

		it('should return a 401 status for requests without a valid API key', async () => {
			// Temporarily modify the API key to simulate an unauthorized request
			process.env.CHARITY_COMMISSION_API_KEY = 'invalid_test_key';

			const res = await request(app).get(
				`/api/charityregister/${validCharityRegisterNumber}`
			);

			// Assuming your API correctly handles unauthorized requests, expecting a 401 Unauthorized response
			expect(res.statusCode).to.equal(401);
			expect(res.body)
				.to.have.property('message')
				.that.includes('Unauthorized');

			// Restore the original API key after this test
			after(() => {
				process.env.CHARITY_COMMISSION_API_KEY = originalApiKey;
			});
		});
	});

	// Additional test ideas commented for further implementation:
	// 1. Verify the API returns the required data (name/active) for a valid charity number.
	// 2. Verify the format of a valid charity registration number (e.g., length, numerical value).
	// 3. Simulate and test the application's response if the Charity Register API is down.
});
