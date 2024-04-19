import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import { pool } from '../dbConnection.js';
import app from '../index.js'; // Import your Express application

const request = supertest(app);

describe('GET /api/auth/verify-email', () => {
	let sandbox;

	beforeEach(() => {
		// Create a sandbox for stubbing
		sandbox = sinon.createSandbox();

		// Stubbing the necessary external calls
		sandbox.stub(pool, 'query');
	});

	afterEach(() => {
		// Restore all the stubs
		sandbox.restore();
	});

	it('should respond with 400 if token is invalid or expired', async () => {
		pool.query.resolves({ rowCount: 0, rows: [] });

		const response = await request
			.get('/api/auth/verify-email')
			.query({ token: 'invalidtoken' });

		expect(response.status).to.equal(400);
		expect(response.body.message).to.equal('Invalid or expired token');
	});

	it('should verify email and respond with 200 on success', async () => {
		pool.query.onFirstCall().resolves({ rowCount: 1, rows: [{ user_id: 1 }] });
		pool.query.onSecondCall().resolves({ rowCount: 1 });

		const response = await request
			.get('/api/auth/verify-email')
			.query({ token: 'validtoken' });

		expect(response.status).to.equal(200);
		expect(response.body.message).to.equal('Email verified successfully');
	});

	it('should handle database errors during email verification', async () => {
		pool.query.onFirstCall().rejects(new Error('Database error'));

		const response = await request
			.get('/api/auth/verify-email')
			.query({ token: 'anytoken' });

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal('Email verification failed.');
	});
});
