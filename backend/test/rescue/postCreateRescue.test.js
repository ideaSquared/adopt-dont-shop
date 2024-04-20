import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import bcrypt from 'bcryptjs';
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import app from '../../index.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';

import { tokenGenerators } from '../../utils/tokenGenerator.js';
import { emailService } from '../../services/emailService.js';

const request = supertest(app);

describe('POST /:type(individual|charity|company) endpoint', () => {
	let sandbox, userToken, cookie;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		sandbox.stub(pool, 'query');
		sandbox.stub(bcrypt, 'hash').resolves('hashedpassword123');

		sandbox
			.stub(tokenGenerators, 'generateResetToken')
			.resolves('resetToken123');
		sandbox.stub(emailService, 'sendEmailVerificationEmail').resolves();

		const secret = process.env.SECRET_KEY;
		const userPayload = { userId: 'testUserId' };
		userToken = jwt.sign(userPayload, secret, { expiresIn: '1h' });
		cookie = `token=${userToken};`;
	});

	afterEach(() => {
		sandbox.restore();
	});

	it('should create a user and rescue successfully for valid data', async () => {
		const type = 'charity';
		const email = 'test@example.com';
		const password = 'secure123';

		pool.query.onFirstCall().resolves({ rows: [], rowCount: 0 });
		pool.query.onSecondCall().resolves({ rows: [{ user_id: '1' }] });
		pool.query.onThirdCall().resolves({ rows: [{ rescue_id: '1' }] });
		pool.query.onCall(3).resolves({ rows: [{ staff_id: '1' }] });

		const response = await request
			.post(`/api/rescue/${type}`)
			.send({
				email,
				password,
				firstName: 'John',
				lastName: 'Doe',
				rescueData: { city: 'CityA', country: 'CountryA' },
			})
			.expect(201);

		expect(response.status).to.equal(201);
		expect(tokenGenerators.generateResetToken.calledOnce).to.be.true;
		expect(emailService.sendEmailVerificationEmail.calledOnce).to.be.true;
		expect(response.body.message).to.include(
			'rescue and staff member created successfully'
		);
	});

	it('should return 400 if password is missing', async () => {
		const type = 'individual';

		const response = await request
			.post(`/api/rescue/${type}`)
			.send({ email: 'test@example.com' })
			.expect(400);

		expect(response.status).to.equal(400);
		expect(response.body.message).to.equal('Password is required.');
	});

	it('should return 409 if the user already exists', async () => {
		const type = 'company';
		const email = 'existing@example.com';
		const password = 'secure123';

		pool.query.onFirstCall().resolves({ rows: [{ email }], rowCount: 1 });

		const response = await request
			.post(`/api/rescue/${type}`)
			.send({
				email,
				password,
				firstName: 'John',
				lastName: 'Doe',
				rescueData: { city: 'CityA', country: 'CountryA' },
			})
			.expect(409);

		expect(response.status).to.equal(409);
		expect(response.body.message).to.equal(
			'User already exists - please try login or reset password'
		);
	});

	it('should handle database errors during user creation gracefully', async () => {
		const type = 'charity';
		const email = 'testfail@example.com';
		const password = 'secure123';

		pool.query.onFirstCall().rejects(new Error('Database error'));

		const response = await request
			.post(`/api/rescue/${type}`)
			.send({
				email,
				password,
				firstName: 'John',
				lastName: 'Doe',
				rescueData: { city: 'CityA', country: 'CountryA' },
			})
			.expect(500);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal('Failed to create Charity rescue');
	});
});
