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

	// Use environment variables or hardcoded values for testing
	const validCharityRegisterNumber = '1190812' || '203644'; // Example valid number
	const invalidCharityRegisterNumber = '1109139' || '654321'; // Example invalid but existent number
	const nonExistentCharityRegisterNumber = '0000000'; // Assumed non-existent for testing

	before(() => {
		// Save the original API key before tests modify it
		originalApiKey = process.env.CHARITY_COMMISSION_API_KEY;
	});

	after(() => {
		// Restore the original API key after tests have completed
		process.env.CHARITY_COMMISSION_API_KEY = originalApiKey;
	});

	describe('GET /api/charityregister/:registeredNumber', function () {
		this.timeout(10000); // Extends default timeout for external API calls

		it('should validate and return data for a valid charity number', async () => {
			const res = await request(app).get(
				`/api/charityregister/${validCharityRegisterNumber}`
			);

			expect(res.statusCode).to.equal(200);
			expect(res.body.data).to.not.be.empty; // Assuming 'data' contains the charity details
		});

		it('should indicate validation failure for a removed but valid reference number', async () => {
			const res = await request(app).get(
				`/api/charityregister/${invalidCharityRegisterNumber}`
			);

			expect(res.statusCode).to.equal(400);
			expect(res.body.message).to.include(
				'Charity does not meet the validation criteria'
			);
		});

		it('should return a 404 status for a non-existent charity number', async () => {
			const res = await request(app).get(
				`/api/charityregister/${nonExistentCharityRegisterNumber}`
			);

			expect(res.statusCode).to.equal(404);
			expect(res.body.message).to.include(
				'No charity found with the provided reference number'
			);
		});

		it('should return a 401 status for requests with an invalid API key', async () => {
			// Modify the API key environment variable to simulate an unauthorized request
			process.env.CHARITY_COMMISSION_API_KEY = 'invalid_test_key';

			const res = await request(app).get(
				`/api/charityregister/${validCharityRegisterNumber}`
			);

			// Restore the original API key for subsequent tests
			process.env.CHARITY_COMMISSION_API_KEY = originalApiKey;

			expect(res.statusCode).to.equal(401);
			expect(res.body.message).to.include('Unauthorized');
		});

		// Additional tests for thorough coverage could be implemented here
	});
});
