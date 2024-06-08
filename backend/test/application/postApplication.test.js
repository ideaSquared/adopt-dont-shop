import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import app from '../../index.js';
import { pool } from '../../dbConnection.js';
import jwt from 'jsonwebtoken';

const request = supertest(app);

describe('POST /api/applications (User)', () => {
	let sandbox, userToken, cookie;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		sandbox.stub(pool, 'query');

		const secret = process.env.SECRET_KEY;
		const userPayload = { userId: 'userId' };
		userToken = jwt.sign(userPayload, secret, { expiresIn: '1h' });
		cookie = `token=${userToken};`;
	});

	afterEach(() => {
		sandbox.restore();
	});

	it('should create a new application successfully', async () => {
		const newApplication = {
			user_id: 'userId',
			pet_id: 'pet1',
			description: 'Looking to adopt this pet.',
			status: 'pending',
		};

		pool.query.resolves({ rows: [newApplication] });

		const response = await request
			.post('/api/applications')
			.set('Cookie', cookie)
			.send(newApplication)
			.expect(201);

		expect(response.status).to.equal(201);
		expect(response.body.data).to.deep.equal(newApplication);
		expect(response.body.message).to.equal('Application created successfully');
	});

	it('should handle errors gracefully if there is a database error', async () => {
		const newApplication = {
			user_id: 'userId',
			pet_id: 'pet1',
			description: 'Looking to adopt this pet.',
			status: 'pending',
		};

		pool.query.rejects(new Error('Database error'));

		const response = await request
			.post('/api/applications')
			.set('Cookie', cookie)
			.send(newApplication)
			.expect(500);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal('An error occurred');
		expect(response.body.error).to.include('Database error');
	});
});
