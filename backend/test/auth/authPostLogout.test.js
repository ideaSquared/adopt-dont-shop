import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import app from '../../index.js';
// import logger from '../utils/Logger.js';

const request = supertest(app);

describe('POST /api/auth/logout', () => {
	let sandbox;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		// sandbox.stub(logger, 'info');
	});

	afterEach(() => {
		sandbox.restore();
	});

	it('should clear the user session and log out successfully', async () => {
		const response = await request.post('/api/auth/logout');

		expect(response.status).to.equal(200);
		expect(response.body.message).to.equal('Logged out successfully');

		// Check if 'set-cookie' is present and contains token clearance
		if (response.headers['set-cookie']) {
			const cookieSetting = response.headers['set-cookie'].some(
				(cookie) => cookie.startsWith('token=;') || cookie.includes('expires=')
			);
			expect(cookieSetting).to.be.true;
		} else {
			throw new Error('No cookies were set in the response');
		}

		// sinon.assert.calledWith(logger.info, 'User logout initiated');
		// sinon.assert.calledWith(logger.info, 'User logged out successfully');
	});
});
