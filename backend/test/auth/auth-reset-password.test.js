import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import bcrypt from 'bcryptjs';
import { pool } from '../../dbConnection.js';
import app from '../../index.js';

const request = supertest(app);

describe('POST /api/auth/reset-password', () => {
	let sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		sandbox.stub(pool, 'query');
		sandbox.stub(bcrypt, 'hash').resolves('hashedPassword');
	});

	afterEach(() => {
		sandbox.restore();
	});

	it('should respond with 400 if the token is invalid or expired', async () => {
		pool.query.resolves({ rowCount: 0 });

		const response = await request
			.post('/api/auth/reset-password')
			.send({ token: 'invalidOrExpiredToken', newPassword: 'newPassword123' });

		expect(response.status).to.equal(400);
		expect(response.body.message).to.equal('Token is invalid or has expired.');
	});

	it('should reset the password successfully and respond with 200', async () => {
		pool.query.onFirstCall().resolves({ rowCount: 1, rows: [{ user_id: 1 }] });
		pool.query.onSecondCall().resolves();

		const response = await request
			.post('/api/auth/reset-password')
			.send({ token: 'validToken', newPassword: 'newPassword123' });

		expect(response.status).to.equal(200);
		expect(response.body.message).to.equal('Password has been reset.');
	});

	it('should respond with 500 if an error occurs during the password reset process', async () => {
		pool.query.onFirstCall().resolves({ rowCount: 1, rows: [{ user_id: 1 }] });
		pool.query.onSecondCall().rejects(new Error('Database Error'));

		const response = await request
			.post('/api/auth/reset-password')
			.send({ token: 'validTokenButError', newPassword: 'newPassword123' });

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal(
			'An error occurred while resetting the password. Please try again.'
		);
	});
});
