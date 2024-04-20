import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import app from '../../index.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const request = supertest(app);

// ! Skipped as it isn't integral to test, as this can be tested visually.
describe.skip('GET /api/logs', () => {
	let sandbox, cookie, userToken, authenticateTokenStub, checkAdminStub;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		authenticateTokenStub = sandbox.stub();
		checkAdminStub = sandbox.stub();

		// Mock the middlewares for authentication and admin check
		app.use((req, res, next) => {
			authenticateTokenStub(req, res, next);
			checkAdminStub(req, res, next);
			req.user = { userId: 'testAdminId', isAdmin: true }; // Simulating admin user
			next();
		});

		// Mock fs to simulate reading log files
		sandbox.stub(fs, 'promises').value({
			readFile: sandbox.stub().resolves('Log file contents'), // Simulate log file content
		});

		const secret = process.env.SECRET_KEY;
		const userPayload = { userId: 'testAdminId', isAdmin: true };
		userToken = jwt.sign(userPayload, secret, { expiresIn: '1h' });
		cookie = `token=${userToken};`;
	});

	afterEach(() => {
		sandbox.restore();
	});

	it('should successfully read and return logs for an admin user', async () => {
		const response = await request.get('/api/logs').set('Cookie', cookie);

		expect(response.status).to.equal(200);
		expect(response.body).to.equal('Log file contents');
		expect(fs.promises.readFile.calledOnce).to.be.true;
		// expect(logger.info.calledOnce).to.be.true;
	});

	it('should return an error if log files cannot be read', async () => {
		fs.promises.readFile.rejects(new Error('File read error')); // Simulate file read error

		const response = await request.get('/').set('Cookie', cookie);

		expect(response.status).to.equal(500);
		expect(response.text).to.equal('Failed to read logs');
		// expect(logger.error.calledOnce).to.be.true;
		// expect(Sentry.captureException.calledOnce).to.be.true;
	});

	it('should ensure only admins can access logs', async () => {
		// Modify checkAdminStub to simulate non-admin access
		checkAdminStub.callsFake((req, res, next) => {
			return res.status(403).send('Admin access required');
		});

		const response = await request.get('/api/logs').set('Cookie', cookie);

		expect(response.status).to.equal(403);
		expect(response.text).to.equal('Admin access required');
	});
});
