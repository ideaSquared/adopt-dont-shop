import request from 'supertest';
import sinon from 'sinon';
import { expect } from 'chai';
import jwt from 'jsonwebtoken';
import app from '../index.js';
import { connectToDatabase, disconnectFromDatabase } from './database.js';
import { generateObjectId } from '../utils/generateObjectId.js';

const mockUserId = generateObjectId().toString();

describe.only('Log Routes', function () {
	const token = 'dummyToken'; // Simulate an auth token.
	const cookie = `token=${token};`; // Simulate a browser cookie containing the auth token.

	beforeEach(async () => {
		sinon.resetBehavior(); // Clears any existing behaviors on stubs.
		sinon.resetHistory(); // Clears history of calls to stubs.

		await connectToDatabase();
		sinon.stub(jwt, 'verify');
	});

	afterEach(async () => {
		await disconnectFromDatabase();
		sinon.restore();
	});

	context('As an admin user...', () => {
		beforeEach(() => {
			jwt.verify.callsFake((token, secret, callback) => {
				callback(null, { userId: mockUserId, isAdmin: true });
			});
		});

		it('should get all logs for an admin', async () => {
			const response = await request(app)
				.get('/api/logs')
				.set('Cookie', cookie)
				.expect('Content-Type', /json/)
				.expect(200);

			expect(response.body).to.be.an('array');
		});
	});

	context('As a non-admin user...', () => {
		beforeEach(() => {
			jwt.verify.callsFake((token, secret, callback) => {
				callback(null, { userId: mockUserId, isAdmin: false });
			});
		});

		it('should not allow access to logs for a non-admin', async () => {
			await request(app).get('/api/logs').set('Cookie', cookie).expect(403); // Assuming 403 Forbidden response for non-admins
		});
	});
});
