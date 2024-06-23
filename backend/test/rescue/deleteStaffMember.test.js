import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import app from '../../index.js'; // Adjust as necessary
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';
import { permissionService } from '../../services/permissionService.js';

const request = supertest(app);

describe('DELETE /api/rescue/:rescueId/staff/:staffId endpoint', () => {
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

	it('should successfully delete a staff member when authorized', async () => {
		const rescueId = '1';
		const staffId = '2';
		const editorUserId = '3';

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
				sinon.match({ text: sinon.match(/DELETE FROM staff_members WHERE/) })
			)
			.resolves({ rowCount: 1 });

		const response = await request
			.delete(`/api/rescue/${rescueId}/staff/${staffId}`)
			.set('Cookie', cookie)
			.expect(200);

		expect(response.status).to.equal(200);
		expect(response.body.message).to.equal('Staff member deleted successfully');
	});

	it('should return 404 if the rescue is not found', async () => {
		const rescueId = '4';
		const staffId = '5';

		sandbox.stub(permissionService, 'checkPermission').resolves(true);

		pool.query.resolves({ rows: [], rowCount: 0 }); // No rescue found

		const response = await request
			.delete(`/api/rescue/${rescueId}/staff/${staffId}`)
			.set('Cookie', cookie)
			.expect(404);

		expect(response.status).to.equal(404);
		expect(response.body.message).to.equal('Rescue not found');
	});

	it('should return 403 if the user does not have permission to delete staff', async () => {
		const rescueId = '1';
		const staffId = '2';
		const editorUserId = '3'; // This is the authenticated user's ID
		sandbox.stub(permissionService, 'checkPermission').resolves(false);

		pool.query
			.onFirstCall()
			.resolves({ rows: [{ rescue_id: rescueId }], rowCount: 1 }); // Rescue found
		pool.query.onSecondCall().resolves({ rows: [], rowCount: 0 }); // No permission found

		const response = await request
			.delete(`/api/rescue/${rescueId}/staff/${staffId}`)
			.set('Cookie', cookie)
			.expect(403);

		expect(response.status).to.equal(403);
		expect(response.body.message).to.equal('No permission to delete staff');
	});

	it('should return 403 if the user attempts to delete their own user record', async () => {
		const rescueId = '1';
		const staffId = 'testUserId'; // Same as editorUserId, simulating a self-delete attempt
		sandbox.stub(permissionService, 'checkPermission').resolves(true);

		pool.query
			.onFirstCall()
			.resolves({ rows: [{ rescue_id: rescueId }], rowCount: 1 }); // Rescue found

		const response = await request
			.delete(`/api/rescue/${rescueId}/staff/${staffId}`)
			.set('Cookie', cookie)
			.expect(403);

		expect(response.status).to.equal(403);
		expect(response.body.message).to.equal('Cannot delete your own user');
	});
});
