import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import app from '../../index.js'; // Adjust as necessary
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import { geoService } from '../../services/geoService.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';

const request = supertest(app);

describe('PUT /api/rescue/:id endpoint', () => {
	let sandbox, userToken, cookie;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		sandbox.stub(pool, 'query');

		sandbox.stub(geoService, 'getGeocodePoint');

		const secret = process.env.SECRET_KEY;
		const userPayload = { userId: 'testUserId' };
		userToken = jwt.sign(userPayload, secret, { expiresIn: '1h' });
		cookie = `token=${userToken};`;
	});

	afterEach(() => {
		sandbox.restore();
	});

	it('should successfully update a rescue without geocoding', async () => {
		const rescueId = '1';
		const newDetails = {
			rescueName: 'New Name',
			city: 'Old City',
			country: 'Old Country',
			rescueType: 'charity',
			referenceNumber: '12345',
			referenceNumberVerified: true,
		};

		pool.query.resolves({ rows: [newDetails], rowCount: 1 });

		const response = await request
			.put(`/api/rescue/${rescueId}`)
			.set('Cookie', cookie)
			.send(newDetails)
			.expect(200);

		expect(response.status).to.equal(200);
		expect(response.body.data).to.include(newDetails);
		expect(response.body.message).to.equal('Rescue updated successfully');
	});

	it('should successfully update a rescue with geocoding', async () => {
		const rescueId = '2';
		const newDetails = {
			rescueName: 'New Name',
			city: 'New City',
			country: 'New Country',
			rescueType: 'charity',
			referenceNumber: '54321',
			referenceNumberVerified: true,
		};

		geoService.getGeocodePoint.resolves('(10, 20)');
		pool.query.resolves({ rows: [newDetails], rowCount: 1 });

		const response = await request
			.put(`/api/rescue/${rescueId}`)
			.set('Cookie', cookie)
			.send(newDetails)
			.expect(200);

		expect(response.status).to.equal(200);
		expect(response.body.data).to.include(newDetails);
		// expect(response.body.data.location).to.equal('(10, 20)');
		expect(response.body.message).to.equal('Rescue updated successfully');
	});

	it('should return an error when geocoding fails', async () => {
		const rescueId = '3';
		const newDetails = {
			city: 'New City',
			country: 'New Country',
		};

		geoService.getGeocodePoint.rejects(new Error('Geocoding failed'));

		const response = await request
			.put(`/api/rescue/${rescueId}`)
			.set('Cookie', cookie)
			.send(newDetails)
			.expect(500);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal(
			'Geocoding failed, unable to update rescue details.'
		);
	});

	it('should return 404 when the rescue is not found', async () => {
		const rescueId = '4';
		const newDetails = {
			rescueName: 'Name',
		};

		pool.query.resolves({ rows: [], rowCount: 0 });

		const response = await request
			.put(`/api/rescue/${rescueId}`)
			.set('Cookie', cookie)
			.send(newDetails)
			.expect(404);

		expect(response.status).to.equal(404);
		expect(response.body.message).to.equal('Rescue not found');
	});
});
