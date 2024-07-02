import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import app from '../../index.js'; // Adjust as necessary
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { permissionService } from '../../services/permissionService.js';
import { emailService } from '../../services/emailService.js';

const request = supertest(app);

describe.only('POST /api/rescue/:rescueId/staff endpoint', function () {
	this.timeout(10000); // Setting the timeout to 10 seconds
	let sandbox, userToken, cookie;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		sandbox.stub(pool, 'query');
		sandbox.stub(bcrypt, 'hash').resolves('hashedPassword123');

		const secret = process.env.SECRET_KEY;
		const userPayload = { userId: 'testUserId' };
		userToken = jwt.sign(userPayload, secret, { expiresIn: '1h' });
		cookie = `token=${userToken};`;
	});

	afterEach(() => {
		sinon.restore();
		sandbox.restore();
	});

	it('should successfully add a new staff member when authorized', async () => {
		const rescueId = '1';
		const newStaffDetails = {
			email: 'newstaff@example.com',
			firstName: 'John',
			password: 'password123',
			permissions: ['edit_rescue_info'],
		};
		sandbox.stub(permissionService, 'checkPermission').resolves(true);
		sandbox.stub(emailService, 'sendAccountCreationEmail').resolves();

		// Mock database responses
		pool.query
			.withArgs(
				sinon.match({
					text: sinon.match(/SELECT \* FROM rescues WHERE rescue_id/),
				})
			)
			.resolves({ rows: [{ rescue_id: rescueId }], rowCount: 1 });
		pool.query
			.withArgs(
				sinon.match({ text: sinon.match(/SELECT \* FROM users WHERE email/) })
			)
			.resolves({ rows: [], rowCount: 0 });
		pool.query
			.withArgs(sinon.match({ text: sinon.match(/INSERT INTO users/) }))
			.resolves({ rows: [{ user_id: 'newUser123' }] });
		pool.query
			.withArgs(
				sinon.match({
					text: sinon.match(
						/SELECT \* FROM staff_members WHERE rescue_id = \$1 AND user_id = \$2/
					),
				})
			)
			.resolves({ rows: [], rowCount: 0 });
		pool.query.onCall(4).resolves({
			rows: [
				{ permissions: newStaffDetails.permissions, user_id: 'newUser123' },
			],
		});

		const response = await request
			.post(`/api/rescue/${rescueId}/staff`)
			.send(newStaffDetails)
			.set('Cookie', cookie)
			.expect(200);

		expect(response.status).to.equal(200);
		expect(response.body.message).to.equal(
			'New staff member added successfully'
		);
		expect(response.body.data.userId).to.equal('newUser123');
	});

	it('should return 403 when the editor user does not have permission', async () => {
		const rescueId = '2';
		sandbox.stub(permissionService, 'checkPermission').resolves(false);

		pool.query
			.withArgs(
				sinon.match({
					text: sinon.match(/SELECT \* FROM rescues WHERE rescue_id/),
				})
			)
			.resolves({ rows: [{ rescue_id: rescueId }], rowCount: 1 });

		const response = await request
			.post(`/api/rescue/${rescueId}/staff`)
			.set('Cookie', cookie)
			.send({ email: 'test@example.com', permissions: ['edit_rescue_info'] })
			.expect(403);

		expect(response.status).to.equal(403);
		expect(response.body.message).to.equal('No permission to add staff');
	});

	it('should return 409 if the staff member already exists', async () => {
		sandbox.stub(permissionService, 'checkPermission').resolves(true);

		const rescueId = '3';
		const existingUserEmail = 'existing@example.com';

		pool.query
			.onFirstCall()
			.resolves({ rows: [{ rescue_id: rescueId }], rowCount: 1 });
		pool.query
			.onSecondCall()
			.resolves({ rows: [{ permissions: ['edit_rescue_info'] }], rowCount: 1 });
		pool.query.onThirdCall().resolves({
			rows: [{ user_id: 'existingUser123', email: existingUserEmail }],
			rowCount: 1,
		});
		pool.query
			.onCall(3)
			.resolves({ rows: [{ user_id: 'existingUser123' }], rowCount: 1 }); // Staff member exists check

		const response = await request
			.post(`/api/rescue/${rescueId}/staff`)
			.set('Cookie', cookie)
			.send({ email: existingUserEmail, permissions: ['edit_rescue_info'] })
			.expect(409);

		expect(response.status).to.equal(409);
		expect(response.body.message).to.equal('Staff member already exists');
	});

	it('should handle errors gracefully if a database error occurs', async () => {
		const rescueId = '4';

		pool.query.rejects(new Error('Database error'));

		const response = await request
			.post(`/api/rescue/${rescueId}/staff`)
			.set('Cookie', cookie)
			.expect(500);

		expect(response.status).to.equal(500);
		expect(response.body.message).to.equal('Failed to add new staff');
	});
});
