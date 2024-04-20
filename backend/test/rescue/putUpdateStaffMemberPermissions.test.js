import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import app from '../../index.js'; // Adjust as necessary
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import { permissionService } from '../../services/permissionService.js'; // Ensure this is set up correctly
import jwt from 'jsonwebtoken';

const request = supertest(app);

describe('PUT /api/rescue/:rescueId/staff/:staffId/permissions endpoint', () => {
	let sandbox, userToken, cookie;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		sandbox.stub(pool, 'query');
		sandbox.stub(permissionService, 'checkPermission').resolves(true); // Assume permission check passes by default
		const secret = process.env.SECRET_KEY;
		const userPayload = { userId: 'testUserId' };
		userToken = jwt.sign(userPayload, secret, { expiresIn: '1h' });
		cookie = `token=${userToken};`;
	});

	afterEach(() => {
		sandbox.restore();
	});

	it('should successfully update staff permissions', async () => {
		const rescueId = '1';
		const staffId = '2';
		const permissions = ['edit_pets', 'delete_pets'];

		pool.query.onFirstCall().resolves({ rows: [{ rescue_id: rescueId }] }); // Mock rescue found
		pool.query
			.onSecondCall()
			.resolves({ rows: [{ user_id: staffId, permissions }] }); // Mock staff found and permissions updated

		const response = await request
			.put(`/api/rescue/${rescueId}/staff/${staffId}/permissions`)
			.set('Cookie', cookie)
			.send({ permissions })
			.expect(200);

		expect(response.status).to.equal(200);
		expect(response.body.message).to.equal('Permissions updated successfully');
		expect(response.body.data.permissions).to.deep.equal(permissions);
	});

	it('should return 404 if the rescue is not found', async () => {
		const rescueId = '3';
		const staffId = '4';

		pool.query.resolves({ rows: [], rowCount: 0 }); // No rescue found

		const response = await request
			.put(`/api/rescue/${rescueId}/staff/${staffId}/permissions`)
			.set('Cookie', cookie)
			.send({ permissions: ['edit_pets'] })
			.expect(404);

		expect(response.status).to.equal(404);
		expect(response.body.message).to.equal('Rescue not found');
	});

	it('should return 404 if the staff member is not found', async () => {
		const rescueId = '1';
		const staffId = '5';
		const permissions = ['edit_pets'];

		pool.query.onFirstCall().resolves({ rows: [{ rescue_id: rescueId }] }); // Rescue found
		pool.query.onSecondCall().resolves({ rows: [], rowCount: 0 }); // No staff found

		const response = await request
			.put(`/api/rescue/${rescueId}/staff/${staffId}/permissions`)
			.set('Cookie', cookie)
			.send({ permissions })
			.expect(404);

		expect(response.status).to.equal(404);
		expect(response.body.message).to.equal('Staff member not found');
	});

	it('should return 403 if the editor has no permission to update staff', async () => {
		const rescueId = '1';
		const staffId = '2';
		permissionService.checkPermission.resolves(false); // Mock no permission

		pool.query.onFirstCall().resolves({ rows: [{ rescue_id: rescueId }] }); // Rescue found
		pool.query.onSecondCall().resolves({ rows: [], rowCount: 0 }); // No staff found

		const response = await request
			.put(`/api/rescue/${rescueId}/staff/${staffId}/permissions`)
			.set('Cookie', cookie)
			.send({ permissions: ['edit_pets'] })
			.expect(403);

		expect(response.status).to.equal(403);
		expect(response.body.message).to.equal('No permission to add staff');
	});
});
