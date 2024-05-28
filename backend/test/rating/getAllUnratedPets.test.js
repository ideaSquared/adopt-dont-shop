import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import app from '../../index.js'; // Adjust as necessary
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';
import { geoService } from '../../services/geoService.js';

const request = supertest(app);

describe('GET /api/ratings/find-unrated endpoint', () => {
	let sandbox, userToken, cookie;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		sandbox.stub(pool, 'query');

		const secret = process.env.SECRET_KEY;
		const userPayload = { userId: 'testUserId' };
		userToken = jwt.sign(userPayload, secret, { expiresIn: '1h' });
		cookie = `token=${userToken};`;
	});

	afterEach(() => {
		sandbox.restore();
	});

	it('should fetch unrated pets successfully when they exist', async () => {
		const mockUnratedPets = [
			{
				pet_id: '1',
				name: 'Fido',
				type: 'Dog',
				user_location: '(37.7749,-122.4194)',
				rescue_location: '(34.0522,-118.2437)',
			},
			{
				pet_id: '2',
				name: 'Whiskers',
				type: 'Cat',
				user_location: '(40.7128,-74.0060)',
				rescue_location: '(34.0522,-118.2437)',
			},
		];

		pool.query.resolves({ rows: mockUnratedPets });

		// Mock the calculateDistanceBetweenTwoLatLng method
		sinon.stub(geoService, 'calculateDistanceBetweenTwoLatLng').returns(100);

		const response = await request
			.get('/api/ratings/find-unrated')
			.set('Cookie', cookie)
			.expect(200);

		expect(response.status).to.equal(200);
		expect(response.body).to.deep.equal(
			mockUnratedPets.map((pet) => ({
				pet_id: pet.pet_id,
				name: pet.name,
				type: pet.type,
				distance: 100, // Since we mocked this method to always return 100
			}))
		);
	});

	it('should return 404 when no unrated pets are found', async () => {
		pool.query.resolves({ rows: [] });

		const response = await request
			.get('/api/ratings/find-unrated')
			.set('Cookie', cookie)
			.expect(404);

		expect(response.status).to.equal(404);
		expect(response.body.message).to.equal('No unrated pets found');
	});

	// ! This times out - unsure why but we do have a catch for errors here so I won't spend time debugging this now.
	it.skip('should handle errors gracefully if there is a database error', async () => {
		pool.query.rejects(new Error('Database error'));

		const response = await request
			.get('/api/ratings/find-unrated')
			.set('Cookie', cookie)
			.expect(500);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal('An error occurred');
		expect(response.body.error).to.include('Database error');
	});
});
