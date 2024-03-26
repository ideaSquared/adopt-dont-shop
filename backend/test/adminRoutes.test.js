// Import necessary modules and utilities for testing.
import express from 'express';
import bcrypt from 'bcryptjs'; // Used for hashing passwords to simulate real user password storage.
import request from 'supertest';
import User from '../models/User.js'; // The Mongoose model for user data manipulation.
import Conversation from '../models/Conversation.js';
import Rescue from '../models/Rescue.js';
import Pet from '../models/Pet.js';
import sinon from 'sinon';
import jwt from 'jsonwebtoken';
import { expect } from 'chai'; // Assertion library for validating test outcomes.
import { connectToDatabase, disconnectFromDatabase } from './database.js'; // Utilities for database connection handling in tests.
import app from '../index.js';
import { generateObjectId } from '../utils/generateObjectId.js';

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
		it('should set the users resetTokenForceFlag flag to true', async function () {
			// Create a mock user to test password reset.
			const user = await User.create({
				email: 'test-reset@example.com',
				password: 'oldPassword',
				isAdmin: false,
				resetTokenForceFlag: false,
			});
			const userId = user._id;
			// Attempt to reset the password as an admin.
			const res = await request(app)
				.post(`/api/admin/users/reset-password/${userId}`)
				.set('Cookie', cookie) // Simulate sending the auth cookie.
				.send({ userId }) // Send the new password in the request body.
				.expect(200); // Expect a successful operation.

			// Validate the response to ensure the password reset was successful.
			expect(res.body).to.have.property('message', 'Password reset required.');
		});

		// Test the rejection of a password reset attempt with an invalid new password by an admin.
		/*
		!!! DEPRECIATED: No longer needed as we don't send the password just update the flag 
		*/
		// it('should not reset password with invalid password', async function () {
		// 	// Create another mock user to test invalid password reset.
		// 	const user = await User.create({
		// 		email: 'test-invalid@example.com',
		// 		password: 'oldPassword',
		// 		isAdmin: false,
		// 	});

		// 	const invalidPassword = '123'; // Define an invalid new password (too short).
		// 	// Attempt to reset the password with the invalid new password as an admin.
		// 	const res = await request(app)
		// 		.post(`/api/admin/users/reset-password/${user._id}`)
		// 		.set('Cookie', cookie) // Simulate sending the auth cookie.
		// 		.send({ password: invalidPassword }) // Send the invalid new password in the request body.
		// 		.expect(400); // Expect the operation to fail due to invalid password.

		// 	// Validate the response to ensure the operation was rejected due to the invalid new password.
		// 	expect(res.body).to.have.property('message').that.includes('password');
		// });

		it('should fetch all users successfully', async function () {
			// Simulate adding users to test fetching.
			await User.create([
				{ email: 'user1@example.com', password: 'password1', isAdmin: false },
				{ email: 'user2@example.com', password: 'password2', isAdmin: false },
			]);

			const res = await request(app)
				.get('/api/admin/users')
				.set('Cookie', cookie) // Simulate sending the auth cookie.
				.expect(200); // Expect a successful fetch operation.

			// Validate the response to ensure all users are fetched successfully.
			expect(res.body).to.be.an('array').that.has.lengthOf.at.least(2);
			expect(res.body[0]).to.have.property('email');
			expect(res.body[1]).to.have.property('email');
		});

		it('should delete a user successfully', async function () {
			// Simulate adding a user to test deletion.
			const userToDelete = await User.create({
				email: 'user-to-delete@example.com',
				password: 'password',
				isAdmin: false,
			});

			const res = await request(app)
				.delete(`/api/admin/users/delete/${userToDelete._id}`)
				.set('Cookie', cookie) // Simulate sending the auth cookie.
				.expect(200); // Expect a successful delete operation.

			// Validate the response to ensure the user has been deleted successfully.
			expect(res.body).to.have.property(
				'message',
				'User deleted successfully.'
			);

			// Further validate by trying to fetch the deleted user.
			const fetchDeletedUser = await User.findById(userToDelete._id);
			expect(fetchDeletedUser).to.be.null; // The user should not exist in the database anymore.
		});

		it('should return an error if the user to delete does not exist', async function () {
			const nonExistingUserId = '5e9f8f8f8f8f8f8f8f8f8f8f'; // Simulate a non-existing user ID.

			const res = await request(app)
				.delete(`/api/admin/users/delete/${nonExistingUserId}`)
				.set('Cookie', cookie) // Simulate sending the auth cookie.
				.expect(404); // Expect a 404 Not Found response.

			// Validate the response to ensure the correct error message is returned.
			expect(res.body).to.have.property('message', 'User not found.');
		});

		it('should handle database errors when fetching users', async function () {
			// Stub the find method of the User model to simulate a database error.
			sinon.stub(User, 'find').throws(new Error('Simulated database error'));

			const res = await request(app)
				.get('/api/admin/users')
				.set('Cookie', cookie)
				.expect(500); // Expect an internal server error due to database failure.

			// Validate that the error response is as expected.
			expect(res.body).to.have.property(
				'message',
				'An error occurred while fetching users.'
			);

			// Restore the stubbed method to its original function after the test.
			User.find.restore();
		});

		it('should handle database errors when deleting a user', async function () {
			// Assume user ID to simulate deletion
			const userId = 'someUserId';

			// Stub the findByIdAndDelete method of the User model to simulate a database error.
			sinon
				.stub(User, 'findByIdAndDelete')
				.throws(new Error('Simulated database error'));

			const res = await request(app)
				.delete(`/api/admin/users/delete/${userId}`)
				.set('Cookie', cookie)
				.expect(500); // Expect an internal server error due to database failure.

			// Validate that the error response is as expected.
			expect(res.body).to.have.property('message', 'Failed to delete user.');

			// Restore the stubbed method to its original function after the test.
			User.findByIdAndDelete.restore();
		});

		// Test deleting a pet successfully by an admin.
		it('should delete a pet successfully', async function () {
			// Simulate adding a pet to test deletion.
			const petToDelete = await Pet.create({
				petName: 'Buddy',
				ownerId: generateObjectId(),
				gender: 'Male',
				status: 'Available',
				shortDescription: 'Friendly dog',
				longDescription: 'Very friendly and playful dog',
				type: 'Cat',
				age: 3,
				characteristics: {
					common: {
						size: 'Medium',
						temperament: 'Friendly',
						vaccination_status: 'Up to date',
					},
					specific: {
						breed: 'Golden Retriever',
						intelligence_level: 5,
						activity_level: 'High',
					},
				},
			});

			const res = await request(app)
				.delete(`/api/admin/pets/${petToDelete._id}`)
				.set('Cookie', cookie) // Simulate sending the auth cookie.
				.expect(200); // Expect a successful delete operation.

			// Validate the response to ensure the pet has been deleted successfully.
			expect(res.body).to.have.property('message', 'Pet deleted successfully');

			// Further validate by trying to fetch the deleted pet.
			const fetchDeletedPet = await Pet.findById(petToDelete._id);
			expect(fetchDeletedPet).to.be.null; // The pet should not exist in the database anymore.
		});

		// Test deleting a rescue successfully by an admin.
		it('should delete a rescue successfully', async function () {
			// Simulate adding a rescue to test deletion.
			const rescueToDelete = await Rescue.create({
				rescueName: 'Safe Haven',
				rescueType: 'Charity',
			});

			const res = await request(app)
				.delete(`/api/admin/rescues/${rescueToDelete._id}`)
				.set('Cookie', cookie) // Simulate sending the auth cookie.
				.expect(200); // Expect a successful delete operation.

			// Validate the response to ensure the rescue has been deleted successfully.
			expect(res.body).to.have.property(
				'message',
				'Rescue deleted successfully'
			);

			// Further validate by trying to fetch the deleted rescue.
			const fetchDeletedRescue = await Rescue.findById(rescueToDelete._id);
			expect(fetchDeletedRescue).to.be.null; // The rescue should not exist in the database anymore.
		});

		// Test deleting a conversation successfully by an admin.
		it('should delete a conversation successfully', async function () {
			// Simulate adding a conversation to test deletion.
			const conversationToDelete = await Conversation.create({
				participants: [generateObjectId(), generateObjectId()], // Use actual ObjectId instances or strings that are valid ObjectIds
				messagesCount: 1,
				unreadMessages: 0,
				status: 'active',
				lastMessageBy: generateObjectId(), // Use an actual ObjectId instance or a string that is a valid ObjectId
				startedAt: new Date(),
				startedBy: generateObjectId(), // Use an actual ObjectId instance or a string that is a valid ObjectId
			});

			const res = await request(app)
				.delete(`/api/admin/conversations/${conversationToDelete._id}`)
				.set('Cookie', cookie) // Simulate sending the auth cookie.
				.expect(200); // Expect a successful delete operation.

			// Validate the response to ensure the conversation has been deleted successfully.
			expect(res.body).to.have.property(
				'message',
				'Conversation deleted successfully'
			);

			// Further validate by trying to fetch the deleted conversation.
			const fetchDeletedConversation = await Conversation.findById(
				conversationToDelete._id
			);
			expect(fetchDeletedConversation).to.be.null; // The conversation should not exist in the database anymore.
		});
	});

	// Assuming necessary imports and setup are already in place from the given test setup

	describe('Admin Routes Extended Tests', function () {
		const mockAdminUserId = generateObjectId();

		// Additional setup for admin context is assumed to be done here
		context('as an admin user', function () {
			beforeEach(function () {
				// Stub to simulate admin user verification
				jwt.verify.callsFake((token, secret, callback) => {
					callback(null, { userId: mockAdminUserId, isAdmin: true });
				});
			});

			it('should fetch all rescues successfully', async function () {
				const rescue = new Rescue({
					rescueName: 'Test Rescue',
					rescueType: 'Charity',
					staff: [{ userId: mockAdminUserId, permissions: [] }],
				});
				await rescue.save();

				const res = await request(app)
					.get('/api/admin/rescues')
					.set('Cookie', cookie)
					.expect(200);

				expect(res.body).to.be.an('array').that.is.not.empty;
				const fetchedRescue = res.body.find(
					(r) => r._id.toString() === rescue._id.toString()
				);
				expect(fetchedRescue).to.not.be.undefined;
				expect(fetchedRescue.rescueName).to.equal('Test Rescue');
				expect(fetchedRescue.rescueType).to.equal('Charity');
				expect(fetchedRescue.staff[0].userId).to.equal(
					mockAdminUserId.toString()
				);
			});

			it('should delete a specific rescue by ID successfully', async function () {
				const rescueToDelete = await Rescue.create({
					rescueName: 'Rescue To Delete',
					rescueType: 'Individual',
				});

				const res = await request(app)
					.delete(`/api/admin/rescues/${rescueToDelete._id}`)
					.set('Cookie', cookie)
					.expect(200);

				expect(res.body).to.have.property(
					'message',
					'Rescue deleted successfully'
				);

				const deletedRescue = await Rescue.findById(rescueToDelete._id);
				expect(deletedRescue).to.be.null;
			});

			it.only('should fetch all pets successfully', async function () {
				const pet = new Pet({
					petName: 'Rex',
					ownerId: generateObjectId(), // Use the generateObjectId utility to simulate a valid MongoDB ObjectId
					age: 4,
					shortDescription: 'Friendly and energetic dog',
					longDescription:
						'Rex is a very friendly and energetic dog that loves to play and run around.',
					gender: 'Male',
					status: 'Available',
					type: 'Dog',
					characteristics: {
						common: {
							size: 'Medium',
							temperament: 'Friendly',
							vaccination_status: 'Up-to-date',
						},
						specific: {
							breed: 'Golden Retriever',
							intelligence_level: 'High',
							activity_level: 'High',
						},
					},
				});
				await pet.save();

				const res = await request(app)
					.get('/api/admin/pets')
					.set('Cookie', cookie)
					.expect(200);

				expect(res.body).to.be.an('array').that.is.not.empty;
				const fetchedPet = res.body.find(
					(p) => p._id.toString() === pet._id.toString()
				);
				expect(fetchedPet).to.not.be.undefined;
				expect(fetchedPet.petDetails.petName).to.equal('Rex');
				expect(fetchedPet.petDetails.type).to.equal('Dog');
				expect(fetchedPet.petDetails.age).to.equal(4);
			});

			it('should delete a specific pet by ID successfully', async function () {
				const petToDelete = await Pet.create({
					petName: 'Rex',
					ownerId: generateObjectId(), // Use the generateObjectId utility to simulate a valid MongoDB ObjectId
					age: 4,
					shortDescription: 'Friendly and energetic dog',
					longDescription:
						'Rex is a very friendly and energetic dog that loves to play and run around.',
					gender: 'Male',
					status: 'Available',
					type: 'Dog',
					characteristics: {
						common: {
							size: 'Medium',
							temperament: 'Friendly',
							vaccination_status: 'Up-to-date',
						},
						specific: {
							breed: 'Golden Retriever',
							intelligence_level: 'High',
							activity_level: 'High',
						},
					},
				});

				const res = await request(app)
					.delete(`/api/admin/pets/${petToDelete._id}`)
					.set('Cookie', cookie)
					.expect(200);

				expect(res.body).to.have.property(
					'message',
					'Pet deleted successfully'
				);

				const deletedPet = await Pet.findById(petToDelete._id);
				expect(deletedPet).to.be.null;
			});
		});
	});
});
