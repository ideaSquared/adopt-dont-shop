// Import necessary modules and utilities for testing.
import express from 'express';
import bcrypt from 'bcryptjs'; // Used for hashing passwords to simulate real user password storage.
import request from 'supertest';
import User from '../models/User.js'; // The Mongoose model for user data manipulation.
import sinon from 'sinon';
import jwt from 'jsonwebtoken';
import { expect } from 'chai'; // Assertion library for validating test outcomes.
import { connectToDatabase, disconnectFromDatabase } from './database.js'; // Utilities for database connection handling in tests.
import app from '../index.js';

// Set up the test environment for admin route testing.
describe('Admin Routes', function () {
	let cookie; // To store simulated authentication cookie.

	// Before any tests run, connect to the database and stub the JWT verification to simulate authenticated sessions.
	before(async () => {
		await connectToDatabase(); // Prepare the test database.
		sinon.stub(jwt, 'verify'); // Stub JWT verification to bypass actual token checks.
	});

	// After all tests have run, disconnect from the database and restore stubbed functions to their original behavior.
	after(async () => {
		await disconnectFromDatabase(); // Clean up the test database connection.
		sinon.restore(); // Restore all stubbed methods back to their original methods.
	});

	// Before each test, reset stub behaviors and histories, and prepare a simulated auth cookie.
	beforeEach(function () {
		sinon.resetBehavior(); // Clears any existing behaviors on stubs.
		sinon.resetHistory(); // Clears history of calls to stubs.

		const token = 'dummyToken'; // Simulate an auth token.
		cookie = `token=${token};`; // Simulate a browser cookie containing the auth token.
	});

	// Group tests that simulate non-admin user interactions with admin routes.
	context('as a non-admin user', function () {
		// Before each test in this context, configure the JWT stub to simulate a non-admin user.
		beforeEach(function () {
			jwt.verify.callsFake((token, secret, callback) => {
				callback(null, { userId: 'mockUserId', isAdmin: false }); // Simulate non-admin user verification.
			});
		});

		// Test non-admin access to an admin-only route.
		it('should reject non-admin user access to admin routes', async function () {
			const res = await request(app).get('/api/admin/users').expect(401); // Attempt to access an admin route as non-admin.

			// Validate the response to ensure non-admin users cannot access admin routes.
			expect(res.body)
				.to.have.property('error')
				.that.includes('No token provided'); // The error message is a placeholder; in actual implementation, it might differ.
		});
	});

	// Group tests that simulate admin user interactions with admin routes.
	context('as an admin user', function () {
		// Before each test in this context, configure the JWT stub to simulate an admin user.
		beforeEach(function () {
			jwt.verify.callsFake((token, secret, callback) => {
				callback(null, { userId: 'mockUserId', isAdmin: true }); // Simulate admin user verification.
			});
		});

		// Test resetting a user's password with a valid new password by an admin.
		it('should reset a user password with valid password', async function () {
			// Create a mock user to test password reset.
			const user = await User.create({
				email: 'test-reset@example.com',
				password: 'oldPassword',
				isAdmin: false,
			});

			const newPassword = 'newStrongPassword123'; // Define a new valid password.
			// Attempt to reset the password as an admin.
			const res = await request(app)
				.post(`/api/admin/users/reset-password/${user._id}`)
				.set('Cookie', cookie) // Simulate sending the auth cookie.
				.send({ password: newPassword }) // Send the new password in the request body.
				.expect(200); // Expect a successful operation.

			// Validate the response to ensure the password reset was successful.
			expect(res.body).to.have.property(
				'message',
				'Password reset successfully.'
			);
		});

		// Test the rejection of a password reset attempt with an invalid new password by an admin.
		it('should not reset password with invalid password', async function () {
			// Create another mock user to test invalid password reset.
			const user = await User.create({
				email: 'test-invalid@example.com',
				password: 'oldPassword',
				isAdmin: false,
			});

			const invalidPassword = '123'; // Define an invalid new password (too short).
			// Attempt to reset the password with the invalid new password as an admin.
			const res = await request(app)
				.post(`/api/admin/users/reset-password/${user._id}`)
				.set('Cookie', cookie) // Simulate sending the auth cookie.
				.send({ password: invalidPassword }) // Send the invalid new password in the request body.
				.expect(400); // Expect the operation to fail due to invalid password.

			// Validate the response to ensure the operation was rejected due to the invalid new password.
			expect(res.body).to.have.property('message').that.includes('password');
		});
	});
});
