// rescueRoutes.test.js
import request from 'supertest';
import sinon from 'sinon';
import express from 'express';
import { expect } from 'chai';
import jwt from 'jsonwebtoken';
import Rescue from '../models/Rescue.js';
import rescueRoutes from '../routes/rescueRoutes.js';
import User from '../models/User.js';
import { connectToDatabase, disconnectFromDatabase } from './database.js';
import mongoose from 'mongoose';
import rescueService from '../services/rescueService.js';
import app from '../index.js';
import { generateObjectId } from '../utils/generateObjectId.js';
import { capitalizeFirstChar } from '../utils/stringManipulation.js';

const mockObjectId = '65f1fa2aadeb2ca9f053f7f8';

const validCharityRegisterNumber = '1190812' || '203644'; // Example valid number
const invalidCharityRegisterNumber = '1109139' || '654321'; // Example invalid but existent number
const validCompanyHouseNumber = '05045773';
const invalidCompanyHouseNumber = '08530268';
/**
 * Test suite for testing the rescue-related routes.
 *
 * It covers scenarios including fetching all rescues, fetching a specific rescue by ID,
 * filtering rescues by type, creating individual, charity, and company rescues,
 * updating rescue information, and managing rescue staff.
 */
describe('Rescue Routes', function () {
	let rescueMock, cookie, jwtVerifyStub;

	/**
	 * Sets up the testing environment before each test case runs.
	 * This setup includes connecting to a mock database, creating a mock for the Rescue model,
	 * and stubbing the jwt.verify function globally to allow customization in each test case.
	 */
	beforeEach(async () => {
		sinon.restore(); // Reset sinon to clear previous stubs/mocks

		await connectToDatabase(); // Mock connection to the database.
		rescueMock = sinon.mock(Rescue); // Create a mock of the Rescue model to prevent actual database interaction.

		// Simulate JWT token and set it as a cookie
		const token = 'dummyToken';
		cookie = `token=${token};`;

		// Stub JWT verification to simulate an authenticated user session
		jwtVerifyStub = sinon
			.stub(jwt, 'verify')
			.callsFake((token, secret, callback) => {
				callback(null, {
					userId: 'mockUserId',
					permissions: ['edit_rescue_info', 'add_pet', 'edit_pet'],
					isAdmin: false,
				});
			});
	});

	/**
	 * Cleans up after each test case runs.
	 * This cleanup involves disconnecting from the mock database, restoring the Rescue mock to its original state,
	 * and resetting the sinon environment to ensure a clean slate for the next test.
	 */
	afterEach(async () => {
		await disconnectFromDatabase(); // Mock disconnection from the database.
		rescueMock.restore(); // Restore the Rescue model mock to its original state.
		sinon.restore(); // Reset the sinon environment, removing all mocks, stubs, and spies.

		// Restore JWT stub to ensure clean state for next tests
		if (jwtVerifyStub && jwtVerifyStub.restore) {
			jwtVerifyStub.restore();
		}
	});

	/**
	 * Tests for fetching all rescues.
	 */
	describe('GET /api/rescue', () => {
		it('should fetch all rescues', async function () {
			const mockRescues = [
				{ rescueType: 'Individual', rescueName: 'Test Rescue 1' },
				{ rescueType: 'Charity', rescueName: 'Test Rescue 2' },
			];

			rescueMock.expects('find').withArgs({}).resolves(mockRescues); // Expect the find method to be called with no filters.

			const response = await request(app)
				.get('/api/rescue')
				.set('Cookie', cookie); // Perform a GET request to the /api/rescue endpoint.

			rescueMock.verify(); // Verify that the expected mock interactions occurred.

			expect(response.status).to.equal(200); // Assert that the HTTP response status code is 200 OK.
			expect(response.body.message).to.equal('Rescues fetched successfully'); // Assert that the response message is as expected.
			expect(response.body.data).to.deep.equal(mockRescues); // Assert that the response data matches the mock rescues.
		});
	});

	/**
	 * Tests for fetching a specific rescue by its ID.
	 */
	describe('GET /api/rescue/:id', () => {
		it('should fetch a specific rescue by id', async function () {
			const mockRescueId = mockObjectId; // A mock rescue ID for testing.
			const mockRescueData = {
				_id: mockRescueId,
				rescueType: 'Charity',
				rescueName: 'Specific Test Rescue',
			};

			rescueMock
				.expects('findById')
				.withArgs(mockRescueId)
				.resolves(mockRescueData); // Expect the findById method to be called with the mock rescue ID.

			const response = await request(app)
				.get(`/api/rescue/${mockRescueId}`)
				.set('Cookie', cookie); // Perform a GET request to the /api/rescue/:id endpoint.

			rescueMock.verify(); // Verify that the expected mock interactions occurred.

			expect(response.status).to.equal(200); // Assert that the HTTP response status code is 200 OK.
			expect(response.body.message).to.equal('Rescue fetched successfully'); // Assert that the response message is as expected.
			expect(response.body.data).to.deep.equal(mockRescueData); // Assert that the response data matches the mock rescue data.
		});

		it('should return a 404 status code if the rescue does not exist', async function () {
			const mockRescueId = mockObjectId; // A mock rescue ID for testing.

			rescueMock.expects('findById').withArgs(mockRescueId).resolves(null); // Expect the findById method to be called with the mock rescue ID and resolve to null.

			const response = await request(app)
				.get(`/api/rescue/${mockRescueId}`)
				.set('Cookie', cookie); // Perform a GET request to the /api/rescue/:id endpoint.

			rescueMock.verify(); // Verify that the expected mock interactions occurred.

			expect(response.status).to.equal(404); // Assert that the HTTP response status code is 404 Not Found.
			expect(response.body.message).to.equal('Rescue not found'); // Assert that the response message indicates the rescue was not found.
		});
	});

	/**
	 * Test suite for filtering rescues based on their type.
	 * Iterates over predefined rescue types and checks if the API correctly fetches rescues of each type.
	 */
	describe('GET /api/rescue/filter', () => {
		const rescueTypes = ['Individual', 'Charity', 'Company'];

		rescueTypes.forEach((type) => {
			it(`should fetch all ${type} rescues`, async function () {
				const mockRescues = [
					{ rescueType: type, rescueName: `Test ${type} 1` },
				];

				rescueMock
					.expects('find')
					.withArgs({ rescueType: type })
					.resolves(mockRescues); // Setup mock expectation for the find query with a specific rescue type.

				const response = await request(app)
					.get(`/api/rescue/filter?type=${type}`)
					.set('Cookie', cookie); // Test the filter endpoint with each type.

				rescueMock.verify(); // Verify that the mock expectations were met.

				expect(response.status).to.equal(200); // The response should have a status code of 200.
				expect(response.body.message).to.equal(
					`${type} rescues fetched successfully`
				); // The success message should reflect the rescue type.
				expect(response.body.data).to.deep.equal(mockRescues); // The data returned should match the mock rescues.
			});
		});
	});

	describe('POST /api/rescue/:type', function () {
		this.timeout(5000); // Adjust based on the needs of your tests

		let saveStub, isUniqueStub;

		const mockUserId = generateObjectId();

		before(() => {
			// Stub the save method of the Rescue model to simulate database save operations
			saveStub = sinon.stub(Rescue.prototype, 'save').resolves(true);
			// Stub the isReferenceNumberUnique method if needed
			isUniqueStub = sinon
				.stub(rescueService, 'isReferenceNumberUnique')
				.resolves(true);
		});

		after(() => {
			// Restore the stubbed methods after all tests
			saveStub.restore();
			isUniqueStub.restore();
		});

		const testCases = [
			{
				type: 'individual',
				description:
					'should create an individual rescue and return a 201 status code',
				payload: {
					email: 'individualTest@test.com',
					password: '123456',
					firstName: 'individualTest',
					rescueType: 'Individual',
					// staff: [
					// 	{
					// 		userId: mockUserId,
					// 		permissions: ['edit_rescue_info', 'add_pet'],
					// 		verifiedByRescue: true,
					// 	},
					// ],
				},
				expectedStatusCode: 201,
				expectedMessage: 'Individual rescue created successfully',
			},
			{
				type: 'charity',
				description:
					'should create a charity rescue with a valid charity register number and return a 201 status code',
				payload: {
					email: 'charityTest@test.com',
					password: '123456',
					firstName: 'charityTest',
					rescueName: 'Test Charity',
					rescueAddress: '123 Charity Lane',
					rescueType: 'Charity',
					referenceNumber: validCharityRegisterNumber,
					// staff: [
					// 	{
					// 		userId: mockUserId,
					// 		permissions: ['edit_rescue_info', 'add_pet'],
					// 		verifiedByRescue: true,
					// 	},
					// ],
				},
				expectedStatusCode: 201,
				expectedMessage: 'Charity rescue created successfully',
				setup: () => isUniqueStub.resolves(true),
			},
			{
				type: 'company',
				description:
					'should create a company rescue and return a 201 status code',
				payload: {
					email: 'companyTest@test.com',
					password: '123456',
					firstName: 'companyTest',
					rescueName: 'Test Company',
					rescueType: 'Company',
					rescueAddress: '123 Company Lane',
					referenceNumber: validCompanyHouseNumber,
					// staff: [
					// 	{
					// 		userId: mockUserId,
					// 		permissions: ['edit_rescue_info', 'add_pet'],
					// 		verifiedByRescue: true,
					// 	},
					// ],
				},
				expectedStatusCode: 201,
				expectedMessage: 'Company rescue created successfully',
				setup: () => isUniqueStub.resolves(true),
			},
		];

		testCases.forEach(
			({
				type,
				description,
				payload,
				expectedStatusCode,
				expectedMessage,
				setup,
			}) => {
				it(description, async () => {
					if (setup) setup();
					const response = await request(app)
						.post(`/api/rescue/${type}`) // Dynamic URL segment based on rescue type
						.set('Cookie', cookie)
						.send(payload)
						.expect(expectedStatusCode);

					expect(response.body.message).to.equal(expectedMessage);
					if (payload.referenceNumber) {
						expect(response.body.data.referenceNumberVerified).to.satisfy(
							(verified) => verified === true || verified === false
						);
					}
				});
			}
		);

		it('should return a 400 status code if required fields are missing', async () => {
			const response = await request(app)
				.post('/api/rescue/individual') // Example type
				.set('Cookie', cookie)
				.send({}) // Deliberately missing required fields
				.expect(400);

			// expect(response.body.message).to.include('validation error');
		});
	});

	/**
	 * Test suite for updating rescue information by ID.
	 * It tests various scenarios including successful updates, handling of non-existent rescues,
	 * validation of rescue IDs, and permission checks for editing rescues.
	 */
	describe('PUT /api/rescue/:rescueId', function () {
		let cookie, existingRescueId, jwtVerifyStub, mockUserId, mockUserIdNoPerms;

		beforeEach(() => {
			// Resets the Sinon environment to ensure a clean state for each test.
			sinon.restore();

			// Prepares a mock authentication token for the request.
			const token = 'dummyToken';
			cookie = `token=${token};`;

			// Generates a mock ID for a rescue that exists in the database for testing.
			existingRescueId = generateObjectId();
			mockUserIdNoPerms = generateObjectId();
			mockUserId = generateObjectId();

			// Stubs the JWT verification to simulate an authenticated user without admin privileges.
			jwtVerifyStub = sinon
				.stub(jwt, 'verify')
				.callsFake((token, secret, callback) => {
					callback(null, { userId: mockUserId, isAdmin: false });
				});

			// Stubs the Rescue.findById method to simulate fetching rescues from the database.
			sinon.stub(Rescue, 'findById').callsFake((id) => {
				if (id.toString() === existingRescueId.toString()) {
					return Promise.resolve({
						_id: existingRescueId,
						rescueName: 'Existing Name',
						rescueType: 'Company',
						staff: [
							{
								userId: mockUserId,
								permissions: ['edit_rescue_info'],
								verifiedByRescue: true,
							},
							{
								userId: mockUserIdNoPerms,
								permissions: ['see_messages'],
								verifiedByRescue: true,
							},
						],
						save: sinon.stub().resolves(true),
					});
				} else {
					return Promise.resolve(null);
				}
			});
		});

		afterEach(() => {
			// Restores the JWT verification stub to its original state after each test.
			if (jwtVerifyStub && jwtVerifyStub.restore) {
				jwtVerifyStub.restore();
			}
		});

		// Tests the response when the specified rescue does not exist in the database.
		it('should return a 404 if the rescue is not found', async function () {
			const nonExistingRescueId = generateObjectId();

			const response = await request(app)
				.put(`/api/rescue/${nonExistingRescueId}`)
				.set('Cookie', cookie)
				.send({ rescueName: 'New Name' })
				.expect(404);

			expect(response.body.message).to.equal('Rescue not found');
		});

		// Tests successful update of a rescue with valid data.
		it('should successfully update a rescue with valid data', async function () {
			const validUpdateBody = {
				rescueName: 'Updated Name',
				rescueType: 'Company',
			};

			const response = await request(app)
				.put(`/api/rescue/${existingRescueId}`)
				.set('Cookie', cookie)
				.send(validUpdateBody)
				.expect(200);

			expect(response.body.message).to.equal('Rescue updated successfully');
			expect(response.body.data.rescueName).to.equal(
				validUpdateBody.rescueName
			);
		});

		// Tests handling of invalid rescue IDs.
		it('should return a 400 for an invalid rescue ID', async function () {
			const invalidRescueId = 'invalidId';

			const response = await request(app)
				.put(`/api/rescue/${invalidRescueId}`)
				.set('Cookie', cookie)
				.send({ rescueName: 'New Name' })
				.expect(400);

			expect(response.body.message).to.equal('Invalid rescue ID');
		});

		// Tests permission check for editing rescue information.
		it('should return a 403 if the user does not have permission to edit', async function () {
			// Redefines the JWT verification stub to simulate a user without edit permissions.
			jwtVerifyStub.restore();
			jwtVerifyStub = sinon
				.stub(jwt, 'verify')
				.callsFake((token, secret, callback) => {
					callback(null, { userId: mockUserIdNoPerms, isAdmin: false });
				});

			const response = await request(app)
				.put(`/api/rescue/${existingRescueId}`)
				.set('Cookie', cookie)
				.send({ rescueName: 'New Name' })
				.expect(403);

			expect(response.body.message).to.equal(
				'No permission to edit this rescue'
			);
		});
	});

	/**
	 * Test suite for updating staff information in a rescue entity.
	 * It tests the functionality to update and add staff members to a rescue, ensuring only authorized users can make changes.
	 */
	describe('POST /api/rescue/:rescueId/staff', function () {
		let cookie, existingRescueId, jwtVerifyStub, userFindOneStub;

		const mockEditorUserId = generateObjectId();
		const mockNonEditorUserId = generateObjectId();

		beforeEach(() => {
			// Resets the Sinon environment and stubs.
			sinon.restore();

			// Prepares a mock authentication token and stubs JWT verification.
			const token = 'dummyToken';
			cookie = `token=${token};`;
			jwtVerifyStub = sinon
				.stub(jwt, 'verify')
				.callsFake((token, secret, callback) => {
					callback(null, { userId: mockEditorUserId, isAdmin: false });
				});

			// Generates a mock ID for a rescue that exists in the database.
			existingRescueId = generateObjectId();

			// Stubs for Rescue.findById and User.findOne.
			sinon.stub(Rescue, 'findById').callsFake((id) => {
				if (id.toString() === existingRescueId.toString()) {
					return Promise.resolve({
						_id: existingRescueId,
						staff: [
							{
								userId: mockEditorUserId,
								permissions: ['edit_rescue_info'],
								verifiedByRescue: true,
							},
							{
								userId: mockNonEditorUserId,
								permissions: ['see_messages'],
								verifiedByRescue: true,
							},
						],
						save: sinon.stub().resolves(true),
					});
				} else {
					return Promise.resolve(null);
				}
			});

			// Stub User.findOne to simulate finding a user by email.
			userFindOneStub = sinon.stub(User, 'findOne');
		});

		it('should return a 404 if the rescue is not found', async function () {
			const nonExistingRescueId = generateObjectId();

			const response = await request(app)
				.post(`/api/rescue/${nonExistingRescueId}/staff`)
				.set('Cookie', cookie)
				.send({
					email: 'newstaff@example.com',
					permissions: ['edit_rescue_info'],
				})
				.expect(404);

			expect(response.body.message).to.equal('Rescue not found');
		});

		it('should return a 403 if the user does not have permission to edit staff', async function () {
			jwtVerifyStub.callsFake((token, secret, callback) => {
				callback(null, { userId: mockNonEditorUserId, isAdmin: false });
			});

			const response = await request(app)
				.post(`/api/rescue/${existingRescueId}/staff`)
				.set('Cookie', cookie)
				.send({
					email: 'newstaff@example.com',
					permissions: ['edit_rescue_info'],
					password: 'test',
					firstName: 'Test',
				})
				.expect(403);

			expect(response.body.message).to.equal('No permission to edit staff');
		});

		it('should add a new staff member successfully', async function () {
			userFindOneStub.callsFake(() =>
				Promise.resolve({
					_id: 'mockNewUserId',
					email: 'newstaff@example.com',
					password: 'test',
					firstName: 'Test',
				})
			);

			const response = await request(app)
				.post(`/api/rescue/${existingRescueId}/staff`)
				.set('Cookie', cookie)
				.send({
					email: 'newstaff@example.com',
					permissions: ['edit_rescue_info'],
					firstName: 'New',
					password: 'password',
				})
				.expect(200);

			expect(response.body.message).to.equal(
				'New staff member added successfully'
			);
		});

		it('should return a 409 if the staff member already exists', async function () {
			userFindOneStub.callsFake(() =>
				Promise.resolve({
					_id: mockNonEditorUserId,
					email: 'existingstaff@example.com',
				})
			);

			const response = await request(app)
				.post(`/api/rescue/${existingRescueId}/staff`)
				.set('Cookie', cookie)
				.send({
					email: 'existingstaff@example.com',
					permissions: ['edit_rescue_info'],
					firstName: 'Existing',
					password: 'password',
				})
				.expect(409);

			expect(response.body.message).to.equal('Staff member already exists');
		});

		// Optionally test for creating a new user if one doesn't exist.
		// This part depends on whether you decide to allow staff member creation in this route.
	});

	/**
	 * Test suite for verifying staff members in a rescue entity.
	 * It tests the functionality to verify a staff member's association with a rescue, including authorization and error handling.
	 */
	describe('PUT /api/rescue/:rescueId/staff/:staffId/verify', function () {
		let cookie,
			rescueId,
			staffId,
			staffIdNonEdit,
			userId,
			userIdNonEdit,
			jwtVerifyStub;

		// Setup before each test: resets stubs, prepares authentication, and mocks rescue retrieval.
		beforeEach(async () => {
			sinon.restore();
			const token = 'dummyToken';
			cookie = `token=${token};`;
			rescueId = generateObjectId();
			staffId = generateObjectId();
			staffIdNonEdit = generateObjectId();
			userId = generateObjectId(); // Mock user ID
			userIdNonEdit = generateObjectId();

			// Stub JWT verification to simulate an authenticated user session.
			jwtVerifyStub = sinon
				.stub(jwt, 'verify')
				.callsFake((token, secret, callback) => {
					callback(null, { userId: userId.toString(), isAdmin: false });
				});

			// Stub the Rescue.findById method to simulate database lookup, including staff member details.
			sinon.stub(Rescue, 'findById').callsFake((id) => {
				if (id.toString() === rescueId.toString()) {
					return Promise.resolve({
						_id: rescueId,
						staff: [
							{
								_id: staffId,
								userId: userId,
								permissions: ['edit_rescue_info'],
								verifiedByRescue: true,
							},
							{
								_id: staffIdNonEdit,
								userId: userIdNonEdit,
								permissions: ['see_messages'],
								verifiedByRescue: false,
							},
						],
						save: sinon.stub().resolves(true),
					});
				} else {
					return Promise.resolve(null);
				}
			});
		});

		// Cleanup after each test.
		afterEach(() => {
			if (jwtVerifyStub && jwtVerifyStub.restore) {
				jwtVerifyStub.restore();
			}
		});

		// Tests for various scenarios including rescue not found, unauthorized verification, staff member not found, successful verification, and error handling.
		it('should return a 404 if the rescue is not found', async function () {
			const response = await request(app)
				.put(`/api/rescue/nonExistingRescueId/staff/${staffId}/verify`)
				.set('Cookie', cookie)
				.expect(404);

			expect(response.body.message).to.equal('Rescue not found');
		});

		it('should return a 403 if the user does not have permission to verify staff', async function () {
			jwtVerifyStub.restore();
			jwtVerifyStub = sinon
				.stub(jwt, 'verify')
				.callsFake((token, secret, callback) => {
					callback(null, { userId: userIdNonEdit, isAdmin: false });
				});

			const response = await request(app)
				.put(`/api/rescue/${rescueId}/staff/${userIdNonEdit}/verify`)
				.set('Cookie', cookie)
				.expect(403);

			expect(response.body.message).to.equal('No permission to verify staff');
		});

		it('should return a 404 if the staff member is not found', async function () {
			const response = await request(app)
				.put(`/api/rescue/${rescueId}/staff/nonExistingStaffId/verify`)
				.set('Cookie', cookie)
				.expect(404);

			expect(response.body.message).to.equal('Staff member not found');
		});

		it('should successfully verify a staff member', async function () {
			const response = await request(app)
				.put(`/api/rescue/${rescueId}/staff/${userIdNonEdit}/verify`)
				.set('Cookie', cookie)
				.expect(200);

			expect(response.body.message).to.equal(
				'Staff member verified successfully'
			);
		});

		it('should handle unexpected errors gracefully', async function () {
			// Simulate an error scenario by throwing an error in the findById stub.
			Rescue.findById.restore(); // Restore original stub.
			sinon.stub(Rescue, 'findById').throws(new Error('Unexpected error'));

			const response = await request(app)
				.put(`/api/rescue/${rescueId}/staff/${staffId}/verify`)
				.set('Cookie', cookie)
				.expect(500);

			expect(response.body.message).to.equal('Failed to verify staff');
		});
	});

	// Test suite for deleting a staff member from a rescue
	describe('DELETE /api/rescue/:rescueId/staff/:staffId', function () {
		let cookie, rescueId, staffIdToDelete, editorUserId, jwtVerifyStub;

		// Setup before each test: resets stubs, prepares authentication and mocks rescue retrieval
		beforeEach(async () => {
			sinon.restore();
			const token = 'dummyToken';
			cookie = `token=${token};`;
			rescueId = generateObjectId();
			staffIdToDelete = generateObjectId();
			editorUserId = generateObjectId(); // Mock editor user ID as someone with permission

			// Stub JWT verification to simulate an authenticated user session
			jwtVerifyStub = sinon
				.stub(jwt, 'verify')
				.callsFake((token, secret, callback) => {
					callback(null, { userId: editorUserId.toString(), isAdmin: false });
				});

			// Stub the Rescue.findById method to simulate finding a rescue with staff, including the editor
			sinon.stub(Rescue, 'findById').callsFake((id) => {
				if (id.toString() === rescueId.toString()) {
					return Promise.resolve({
						_id: rescueId,
						staff: [
							{
								_id: staffIdToDelete,
								userId: staffIdToDelete,
								permissions: ['edit_rescue_info'],
								verifiedByRescue: true,
							},
							{
								_id: editorUserId,
								userId: editorUserId,
								permissions: ['edit_rescue_info'],
								verifiedByRescue: true,
							},
						],
						save: sinon.stub().resolves(true),
					});
				} else {
					return Promise.resolve(null);
				}
			});
		});

		// Cleanup after each test
		afterEach(() => {
			if (jwtVerifyStub && jwtVerifyStub.restore) {
				jwtVerifyStub.restore();
			}
		});

		it('should successfully delete a staff member', async function () {
			const response = await request(app)
				.delete(`/api/rescue/${rescueId}/staff/${staffIdToDelete}`)
				.set('Cookie', cookie)
				.expect(200);

			expect(response.body.message).to.equal(
				'Staff member deleted successfully'
			);
		});

		it('should return a 404 if the rescue is not found', async function () {
			const nonExistingRescueId = generateObjectId();

			const response = await request(app)
				.delete(`/api/rescue/${nonExistingRescueId}/staff/${staffIdToDelete}`)
				.set('Cookie', cookie)
				.expect(404);

			expect(response.body.message).to.equal('Rescue not found');
		});

		it('should return a 404 if the staff member is not found', async function () {
			const nonExistingStaffId = generateObjectId();

			const response = await request(app)
				.delete(`/api/rescue/${rescueId}/staff/${nonExistingStaffId}`)
				.set('Cookie', cookie)
				.expect(404);

			expect(response.body.message).to.equal('Staff member not found');
		});

		it('should return a 403 if trying to delete own user', async function () {
			const response = await request(app)
				.delete(`/api/rescue/${rescueId}/staff/${editorUserId}`)
				.set('Cookie', cookie)
				.expect(403);

			expect(response.body.message).to.equal('Cannot delete your own user');
		});

		it('should return a 403 if the user does not have permission to delete staff', async function () {
			const nonEditorUserId = generateObjectId(); // A user without permission
			jwtVerifyStub.restore();
			jwtVerifyStub = sinon
				.stub(jwt, 'verify')
				.callsFake((token, secret, callback) => {
					callback(null, {
						userId: nonEditorUserId.toString(),
						isAdmin: false,
					});
				});

			const response = await request(app)
				.delete(`/api/rescue/${rescueId}/staff/${staffIdToDelete}`)
				.set('Cookie', cookie)
				.expect(403);

			expect(response.body.message).to.equal('No permission to delete staff');
		});
	});

	describe('PUT /api/rescue/:rescueId/staff/:staffId/permissions', () => {
		let cookie, existingRescueId, jwtVerifyStub;

		let staffUserIdPermitted,
			staffUserIdNotPermitted,
			notExistingRescueId,
			staffId;
		staffUserIdPermitted = generateObjectId();
		staffUserIdNotPermitted = generateObjectId();
		staffId = generateObjectId();
		notExistingRescueId = generateObjectId();

		beforeEach(() => {
			// Resets the Sinon environment to ensure a clean state for each test.
			sinon.restore();

			// Prepares a mock authentication token for the request.
			const token = 'dummyToken';
			cookie = `token=${token};`;

			// Stubs the JWT verification to simulate an authenticated user without admin privileges.
			jwtVerifyStub = sinon
				.stub(jwt, 'verify')
				.callsFake((token, secret, callback) => {
					callback(null, { userId: staffUserIdPermitted, isAdmin: false });
				});

			// Generates a mock ID for a rescue that exists in the database for testing.
			existingRescueId = generateObjectId();

			// Stubs the Rescue.findById method to simulate fetching rescues from the database.
			sinon.stub(Rescue, 'findById').callsFake((id) => {
				if (id.toString() === existingRescueId.toString()) {
					return Promise.resolve({
						_id: existingRescueId,
						rescueName: 'Existing Name',
						staff: [
							{
								userId: staffUserIdPermitted,
								permissions: ['edit_rescue_info'],
								verifiedByRescue: true,
							},
							{
								userId: staffUserIdNotPermitted,
								permissions: ['see_messages'],
								verifiedByRescue: true,
							},
						],
						save: sinon.stub().resolves(true),
					});
				} else {
					return Promise.resolve(null);
				}
			});
		});

		afterEach(() => {
			// Restores the JWT verification stub to its original state after each test.
			if (jwtVerifyStub && jwtVerifyStub.restore) {
				jwtVerifyStub.restore();
			}
		});

		it('should update permissions for a staff member', async () => {
			const permissions = ['edit_pet', 'delete_pet'];

			const response = await request(app)
				.put(
					`/api/rescue/${existingRescueId}/staff/${staffUserIdPermitted}/permissions`
				)
				.set('Cookie', cookie)
				.send({ permissions })
				.expect(200);

			expect(response.body.message).to.equal(
				'Permissions updated successfully'
			);
			expect(response.body.data.permissions).to.deep.equal(permissions);
		});

		it('should return a 404 if the rescue is not found', async () => {
			const permissions = ['edit_pet'];

			const response = await request(app)
				.put(`/api/rescue/${notExistingRescueId}/staff/${staffId}/permissions`)
				.set('Cookie', cookie)
				.send({ permissions })
				.expect(404);

			expect(response.body.message).to.equal('Rescue not found');
		});

		it('should return a 403 if the user does not have permission to edit permissions', async () => {
			const permissions = ['edit_pet'];

			jwtVerifyStub.restore();
			jwtVerifyStub = sinon
				.stub(jwt, 'verify')
				.callsFake((token, secret, callback) => {
					callback(null, {
						userId: staffUserIdNotPermitted,
						permissions: ['see_messages'],
						isAdmin: false,
					});
				});

			const response = await request(app)
				.put(`/api/rescue/${existingRescueId}/staff/${staffId}/permissions`)
				.set('Cookie', cookie)
				.send({ permissions })
				.expect(403);

			expect(response.body.message).to.equal(
				'No permission to edit permissions'
			);
		});

		it('should return a 404 if the staff member is not found', async () => {
			const staffId = generateObjectId();
			const permissions = ['edit_pet'];

			// Assume rescue exists but staff does not
			// Rescue.findById mock should be adjusted accordingly

			const response = await request(app)
				.put(`/api/rescue/${existingRescueId}/staff/${staffId}/permissions`)
				.set('Cookie', cookie)
				.send({ permissions })
				.expect(404);

			expect(response.body.message).to.equal('Staff member not found');
		});
	});

	describe('PUT /api/rescue/:rescueId/:type(charity|company)/validate', function () {
		this.timeout(10000);

		const types = ['charity', 'company'];

		let cookie, existingRescueId, jwtVerifyStub;

		let staffUserIdPermitted,
			staffUserIdNotPermitted,
			notExistingRescueId,
			staffId,
			cappedType;

		staffUserIdPermitted = generateObjectId();
		staffUserIdNotPermitted = generateObjectId();
		staffId = generateObjectId();
		notExistingRescueId = generateObjectId();
		const validCompanyHouseNumber = '05045773';
		const invalidCompanyHouseNumber = '08530268';
		const validCharityReferenceNumber = '1190812';
		const invalidCharityReferenceNumber = '1109139';

		beforeEach(() => {
			// Resets the Sinon environment to ensure a clean state for each test.
			sinon.restore();

			// Prepares a mock authentication token for the request.
			const token = 'dummyToken';
			cookie = `token=${token};`;

			// Stubs the JWT verification to simulate an authenticated user without admin privileges.
			jwtVerifyStub = sinon
				.stub(jwt, 'verify')
				.callsFake((token, secret, callback) => {
					callback(null, { userId: staffUserIdPermitted, isAdmin: false });
				});

			// Generates a mock ID for a rescue that exists in the database for testing.
			existingRescueId = generateObjectId();

			// Stubs the Rescue.findById method to simulate fetching rescues from the database.
			sinon.stub(Rescue, 'findById').callsFake((id) => {
				if (id.toString() === existingRescueId.toString()) {
					return Promise.resolve({
						_id: existingRescueId,
						rescueName: 'Existing Name',
						staff: [
							{
								userId: staffUserIdPermitted,
								permissions: ['edit_rescue_info'],
								verifiedByRescue: true,
							},
							{
								userId: staffUserIdNotPermitted,
								permissions: ['see_messages'],
								verifiedByRescue: true,
							},
						],
						save: sinon.stub().resolves(true),
					});
				} else {
					return Promise.resolve(null);
				}
			});
		});

		afterEach(() => {
			// Restores the JWT verification stub to its original state after each test.
			if (jwtVerifyStub && jwtVerifyStub.restore) {
				jwtVerifyStub.restore();
			}
		});

		types.forEach((type) => {
			it(`should update and validate a ${type} with a reference number`, async () => {
				let referenceNumber = '';

				if (type === 'charity') {
					referenceNumber = validCharityReferenceNumber;
				} else if (type === 'company') {
					referenceNumber = validCompanyHouseNumber;
				}

				cappedType = capitalizeFirstChar(type);

				const response = await request(app)
					.put(`/api/rescue/${existingRescueId}/${type}/validate`)
					.set('Cookie', cookie)
					.send({ referenceNumber })
					.expect(200);

				expect(response.body.message).to.equal(
					`${cappedType} rescue updated successfully`
				);
				expect(response.body.data.referenceNumberVerified).to.be.true;
			});

			it(`should return a 404 if the ${type} rescue is not found`, async () => {
				const rescueId = generateObjectId();
				const referenceNumber = 'VALID1234';

				const response = await request(app)
					.put(`/api/rescue/${rescueId}/${type}/validate`)
					.set('Cookie', cookie)
					.send({ referenceNumber })
					.expect(404);

				expect(response.body.message).to.equal('Rescue not found');
			});

			it(`should return a 400 if the reference number already exists for another ${type}`, async () => {
				sinon.stub(rescueService, 'isReferenceNumberUnique').resolves(false);

				const rescueId = generateObjectId();
				const referenceNumber = 'DUPLICATE1234';

				// Mock isReferenceNumberUnique to return false

				const response = await request(app)
					.put(`/api/rescue/${existingRescueId}/${type}/validate`)
					.set('Cookie', cookie)
					.send({ referenceNumber })
					.expect(400);

				expect(response.body.message).to.equal(
					'A rescue with the given reference number already exists'
				);
			});
		});
	});
});
