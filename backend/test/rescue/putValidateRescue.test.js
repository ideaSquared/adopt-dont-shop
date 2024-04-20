import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import app from '../../index.js'; // Adjust as necessary
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';

const request = supertest(app);

const validCharityRegisterNumber = '1190812' || '203644'; // Example valid number
const invalidCharityRegisterNumber = '1109139' || '654321'; // Example invalid but existent number
const validCompanyHouseNumber = '05045773';
const invalidCompanyHouseNumber = '08530268';

describe('PUT /api/rescue/:rescueId/:type(charity|company)/validate endpoint', () => {
	let sandbox, userToken, cookie;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		sandbox.stub(pool, 'query');
		// sandbox
		// 	.stub(fetchAndValidateCharity, 'fetchAndValidateCharity')
		// 	.resolves(true); // Mocking external validation service
		// sandbox
		// 	.stub(fetchAndValidateCompany, 'fetchAndValidateCompany')
		// 	.resolves(true);

		const secret = process.env.SECRET_KEY;
		const userPayload = { userId: 'testUserId' };
		userToken = jwt.sign(userPayload, secret, { expiresIn: '1h' });
		cookie = `token=${userToken};`;
	});

	afterEach(() => {
		sandbox.restore();
	});

	it('should successfully update the rescue with valid reference number', async () => {
		const rescueId = '1';
		const type = 'charity';
		const referenceNumber = validCharityRegisterNumber;

		pool.query.onFirstCall().resolves({
			rows: [{ rescue_id: rescueId, reference_number: null }],
			rowCount: 1,
		});
		pool.query.onSecondCall().resolves({ rows: [], rowCount: 0 }); // No conflict for the new reference number
		pool.query.onThirdCall().resolves({ rows: [{ rescue_id: rescueId }] });

		const response = await request
			.put(`/api/rescue/${rescueId}/${type}/validate`)
			.set('Cookie', cookie)
			.send({ referenceNumber })
			.expect(200);

		expect(response.status).to.equal(200);
		expect(response.body.message).to.equal(
			'Charity rescue updated successfully'
		);
	}).timeout(15000);

	it('should return 404 if the rescue is not found', async () => {
		const rescueId = '2';
		const type = 'charity';

		pool.query.resolves({ rows: [], rowCount: 0 });

		const response = await request
			.put(`/api/rescue/${rescueId}/${type}/validate`)
			.set('Cookie', cookie)
			.expect(404);

		expect(response.status).to.equal(404);
		expect(response.body.message).to.equal('Rescue not found');
	});

	it('should return 400 if the reference number already exists', async () => {
		const rescueId = '3';
		const type = 'company';
		const referenceNumber = 'conflict123';

		pool.query.onFirstCall().resolves({ rows: [{ rescue_id: rescueId }] });
		pool.query
			.onSecondCall()
			.resolves({ rows: [{ rescue_id: rescueId }], rowCount: 1 }); // Conflict found

		const response = await request
			.put(`/api/rescue/${rescueId}/${type}/validate`)
			.set('Cookie', cookie)
			.send({ referenceNumber })
			.expect(400);

		expect(response.status).to.equal(400);
		expect(response.body.message).to.equal(
			'A rescue with the given reference number already exists'
		);
	});

	it('should handle errors gracefully if there is a database error', async () => {
		const rescueId = '4';
		const type = 'charity';

		pool.query.onFirstCall().rejects(new Error('Database error'));

		const response = await request
			.put(`/api/rescue/${rescueId}/${type}/validate`)
			.set('Cookie', cookie)
			.expect(500);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.include('Failed to update Charity rescue');
	});
});
