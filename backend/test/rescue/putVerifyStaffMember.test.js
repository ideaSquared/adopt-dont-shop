import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import app from '../../index.js'; // Adjust as necessary
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';
import { permissionService } from '../../services/permissionService.js';

const request = supertest(app);

describe('PUT /api/rescue/:rescueId/staff/:staffId/verify endpoint', () => {
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

	it('should verify a staff member successfully', async () => {
		const rescueId = '1';
		const staffId = '2';
		const userId = '3';
		sandbox.stub(permissionService, 'checkPermission').resolves(true);

		pool.query
			.withArgs(
				sinon.match({
					text: sinon.match(/SELECT \* FROM rescues WHERE rescue_id/),
				})
			)
			.resolves({ rows: [{ rescue_id: rescueId }], rowCount: 1 });
		pool.query
			.withArgs(
				sinon.match({
					text: sinon.match(/SELECT \* FROM staff_members WHERE rescue_id/),
				})
			)
			.resolves({ rows: [{ user_id: staffId }], rowCount: 1 });
		pool.query
			.withArgs(
				sinon.match({
					text: sinon.match(/SELECT permissions FROM staff_members/),
				})
			)
			.resolves({ rows: [{ permissions: ['edit_rescue_info'] }], rowCount: 1 });

		const response = await request
			.put(`/api/rescue/${rescueId}/staff/${staffId}/verify`)
			.set('Cookie', cookie)
			.expect(200);

		expect(response.status).to.equal(200);
		expect(response.body.message).to.equal(
			'Staff member verified successfully'
		);
	});

	it('should return 404 if the rescue is not found', async () => {
		const rescueId = '4';
		const staffId = '5';
		sandbox.stub(permissionService, 'checkPermission').resolves(true);

		pool.query.resolves({ rows: [], rowCount: 0 }); // Mock no rescue found

		const response = await request
			.put(`/api/rescue/${rescueId}/staff/${staffId}/verify`)
			.set('Cookie', cookie)
			.expect(404);

		expect(response.status).to.equal(404);
		expect(response.body.message).to.equal('Rescue not found');
	});

	it('should return 404 if the staff member is not found', async () => {
		const rescueId = '1';
		const staffId = '6';
		sandbox.stub(permissionService, 'checkPermission').resolves(true);

		pool.query
			.onFirstCall()
			.resolves({ rows: [{ rescue_id: rescueId }], rowCount: 1 }); // Rescue found
		pool.query.onSecondCall().resolves({ rows: [], rowCount: 0 }); // No staff found

		const response = await request
			.put(`/api/rescue/${rescueId}/staff/${staffId}/verify`)
			.set('Cookie', cookie)
			.expect(404);

		expect(response.status).to.equal(404);
		expect(response.body.message).to.equal('Staff member not found');
	});

	it('should return 403 if the user does not have permission to verify staff', async () => {
		const rescueId = '1';
		const staffId = '2';
		const userId = '3';
		sandbox.stub(permissionService, 'checkPermission').resolves(false);

		pool.query
			.onFirstCall()
			.resolves({ rows: [{ rescue_id: rescueId }], rowCount: 1 }); // Rescue found
		pool.query
			.onSecondCall()
			.resolves({ rows: [{ user_id: staffId }], rowCount: 1 }); // Staff found

		const response = await request
			.put(`/api/rescue/${rescueId}/staff/${staffId}/verify`)
			.set('Cookie', cookie)
			.expect(403);

		expect(response.status).to.equal(403);
		expect(response.body.message).to.equal('No permission to verify staff');
	});
});
