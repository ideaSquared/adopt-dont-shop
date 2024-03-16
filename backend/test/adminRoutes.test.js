import request from 'supertest';
import sinon from 'sinon';
import jwt from 'jsonwebtoken';
import app from '../index.js';
import User from '../models/User.js';
import { expect } from 'chai';
import { connectToDatabase, disconnectFromDatabase } from './database.js';

describe('Admin Routes', function () {
	let cookie;

	before(async () => {
		await connectToDatabase();
		sinon.stub(jwt, 'verify');
	});

	after(async () => {
		await disconnectFromDatabase();
		sinon.restore();
	});

	beforeEach(function () {
		sinon.resetBehavior();
		sinon.resetHistory();

		const token = 'dummyToken';
		cookie = `token=${token};`;
	});

	context('as a non-admin user', function () {
		beforeEach(function () {
			jwt.verify.callsFake((token, secret, callback) => {
				callback(null, { userId: 'mockUserId', isAdmin: false });
			});
		});

		it('should reject non-admin user access to admin routes', async function () {
			const res = await request(app).get('/api/admin/users').expect(401);

			expect(res.body)
				.to.have.property('error')
				.that.includes('No token provided');
		});
	});

	context('as an admin user', function () {
		beforeEach(function () {
			jwt.verify.callsFake((token, secret, callback) => {
				callback(null, { userId: 'mockUserId', isAdmin: true });
			});
		});

		it('should reset a user password with valid password', async function () {
			const user = await User.create({
				email: 'test-reset@example.com',
				password: 'oldPassword',
				isAdmin: false,
			});

			const newPassword = 'newStrongPassword123';
			const res = await request(app)
				.post(`/api/admin/users/reset-password/${user._id}`)
				.set('Cookie', cookie)
				.send({ password: newPassword })
				.expect(200);

			expect(res.body).to.have.property(
				'message',
				'Password reset successfully.'
			);
		});

		it('should not reset password with invalid password', async function () {
			const user = await User.create({
				email: 'test-invalid@example.com',
				password: 'oldPassword',
				isAdmin: false,
			});

			const invalidPassword = '123'; // Less than 6 characters
			const res = await request(app)
				.post(`/api/admin/users/reset-password/${user._id}`)
				.set('Cookie', cookie)
				.send({ password: invalidPassword })
				.expect(400);

			expect(res.body).to.have.property('message').that.includes('password');
		});
	});
});
