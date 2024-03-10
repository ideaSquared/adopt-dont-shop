import request from 'supertest';
import sinon from 'sinon';
import jwt from 'jsonwebtoken';
import app from '../index.js';
import User from '../models/User.js'; // Adjust path as needed
import { expect } from 'chai';
import { connectToDatabase, disconnectFromDatabase } from './database.js';

describe('Admin Routes', function () {
	let cookie;

	before(async () => {
		await connectToDatabase();
		sinon.stub(jwt, 'verify'); // Globally stub jwt.verify to configure in each context
	});

	after(async () => {
		await disconnectFromDatabase();
		sinon.restore(); // Restore all stubs once after all tests
	});

	beforeEach(function () {
		// Reset the jwt.verify stub to its default behavior before each test
		// This is crucial because jwt.verify's behavior is modified in different contexts
		sinon.resetBehavior();
		sinon.resetHistory();

		const token = 'dummyToken'; // The actual value is inconsequential due to the stubbing of jwt.verify
		cookie = `token=${token};`; // Prepares the cookie to be attached to every request
	});

	context('as a non-admin user', function () {
		beforeEach(function () {
			// Stub jwt.verify to simulate a non-admin user for each test in this context
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
			// Stub jwt.verify to simulate an admin user for each test in this context
			jwt.verify.callsFake((token, secret, callback) => {
				callback(null, { userId: 'mockUserId', isAdmin: true });
			});
		});

		it('should not delete a user that does not exist', async function () {
			const nonExistentUserId = '5f8d0d55b54764421b7156d9';

			const res = await request(app)
				.delete(`/api/admin/users/delete/${nonExistentUserId}`)
				.set('Cookie', cookie)
				.expect(404);

			expect(res.body)
				.to.have.property('message')
				.that.includes('User not found.');
		});

		it('should not reset password for a user that does not exist', async function () {
			const nonExistentUserId = '5f8d0d55b54764421b7156d9';
			const newPassword = 'newSecurePassword';

			const res = await request(app)
				.post(`/api/admin/users/reset-password/${nonExistentUserId}`)
				.send({ password: newPassword })
				.set('Cookie', cookie) // Use the admin user cookie
				.expect(404); // Not Found response expected

			// Verify that the response includes an error message about the user not being found
			expect(res.body)
				.to.have.property('message')
				.that.includes('User not found.');
		});

		describe('GET /api/admin/users', function () {
			it('should return all users for admin', async function () {
				// Assuming there's a user in your database; here you might want to insert a mock user
				await User.create({
					email: 'test@example.com',
					password: 'password',
					isAdmin: true,
				});

				const res = await request(app)
					.get('/api/admin/users')
					.set('Cookie', cookie) // Include the token in the request
					.expect(200);

				expect(res.body).to.be.an('array');
				expect(res.body.length).to.be.greaterThan(0);
				expect(res.body[0]).to.have.property('email', 'test@example.com');
			});
		});

		describe('DELETE /api/admin/users/delete/:id', function () {
			it('should delete a user by id for admin', async function () {
				// Insert a user to delete
				const user = await User.create({
					email: 'test-delete@example.com',
					password: 'password',
					isAdmin: true,
				});

				const res = await request(app)
					.delete(`/api/admin/users/delete/${user._id}`)
					.set('Cookie', cookie)
					.expect(200);

				expect(res.body).to.have.property(
					'message',
					'User deleted successfully.'
				);

				// Verify user is deleted
				const deletedUser = await User.findById(user._id);
				expect(deletedUser).to.be.null;
			});
		});

		describe('POST /api/admin/users/reset-password/:id', function () {
			it('should reset a user password', async function () {
				// Insert a user to reset password
				const user = await User.create({
					email: 'test-reset@example.com',
					password: 'oldPassword',
					isAdmin: true,
				});

				const newPassword = 'newPassword';
				const res = await request(app)
					.post(`/api/admin/users/reset-password/${user._id}`)
					.set('Cookie', cookie) // Include the token in the request
					.send({ password: newPassword })
					.expect(200);

				expect(res.body).to.have.property(
					'message',
					'Password reset successfully.'
				);
			});
		});
	});
});
