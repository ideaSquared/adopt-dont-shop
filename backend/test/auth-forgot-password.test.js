import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import { pool } from '../dbConnection.js';
import app from '../index.js';
// import handlePasswordReset from '../utils/handleResetPassword.js'; // Default import

const request = supertest(app);

describe('POST /api/auth/forgot-password', () => {
	let sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		sandbox.stub(pool, 'query');
		// sandbox.stub(handlePasswordReset); // Stub the default imported function
	});

	afterEach(() => {
		sinon.restore();
		sandbox.restore();
	});

	it('should send a password reset email if user is found', async () => {
		pool.query.resolves({
			rowCount: 1,
			rows: [{ email: 'user@example.com', user_id: 1 }],
		}); // Simulate finding the user

		const response = await request
			.post('/api/auth/forgot-password')
			.send({ email: 'user@example.com' });

		expect(response.status).to.equal(200);
		expect(response.body.message).to.equal(
			'Password reset email sent. Redirecting to login page...'
		);
	});

	it('should return 404 if no user is found with the provided email', async () => {
		pool.query.resolves({ rowCount: 0 }); // Simulate no user found

		const response = await request
			.post('/api/auth/forgot-password')
			.send({ email: 'nonexistent@example.com' });

		expect(response.status).to.equal(404);
		expect(response.body.message).to.equal('User not found.');
	});

	it.skip('should return 500 if there is an error processing the password reset request', async () => {
		pool.query.resolves({
			rowCount: 1,
			rows: [{ email: 'user@example.com', user_id: 1 }],
		}); // Simulate finding the user
		handlePasswordReset.rejects(new Error('Internal Server Error')); // Simulate an error in the password reset function

		const response = await request
			.post('/api/auth/forgot-password')
			.send({ email: 'user@example.com' });

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal(
			'Failed to process password reset request.'
		);
	});
});
