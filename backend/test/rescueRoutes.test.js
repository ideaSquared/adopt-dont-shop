// rescueRoutes.test.js
import request from 'supertest';
import sinon from 'sinon';
import express from 'express';
import { expect } from 'chai';
import jwt from 'jsonwebtoken';
import Rescue from '../models/Rescue.js';
import rescueRoutes from '../routes/rescueRoutes.js';
import { connectToDatabase, disconnectFromDatabase } from './database.js';
import mongoose from 'mongoose';
import rescueService from '../services/rescueService.js';
import app from '../index.js';
import { generateObjectId } from '../utils/generateObjectId.js';

const mockObjectId = '65f1fa2aadeb2ca9f053f7f8';

/**
 * Test suite for testing the rescue-related routes.
 *
 * It covers scenarios including fetching all rescues, fetching a specific rescue by ID,
 * filtering rescues by type, creating individual, charity, and company rescues,
 * updating rescue information, and managing rescue staff.
 */
describe('Rescue Routes', function () {
	let rescueMock;

	/**
	 * Sets up the testing environment before each test case runs.
	 * This setup includes connecting to a mock database, creating a mock for the Rescue model,
	 * and stubbing the jwt.verify function globally to allow customization in each test case.
	 */
	beforeEach(async () => {
		await connectToDatabase(); // Mock connection to the database.
		rescueMock = sinon.mock(Rescue); // Create a mock of the Rescue model to prevent actual database interaction.
		sinon.stub(jwt, 'verify'); // Stub jwt.verify to bypass actual token verification.
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

			const response = await request(app).get('/api/rescue'); // Perform a GET request to the /api/rescue endpoint.

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

			const response = await request(app).get(`/api/rescue/${mockRescueId}`); // Perform a GET request to the /api/rescue/:id endpoint.

			rescueMock.verify(); // Verify that the expected mock interactions occurred.

			expect(response.status).to.equal(200); // Assert that the HTTP response status code is 200 OK.
			expect(response.body.message).to.equal('Rescue fetched successfully'); // Assert that the response message is as expected.
			expect(response.body.data).to.deep.equal(mockRescueData); // Assert that the response data matches the mock rescue data.
		});

		it('should return a 404 status code if the rescue does not exist', async function () {
			const mockRescueId = mockObjectId; // A mock rescue ID for testing.

			rescueMock.expects('findById').withArgs(mockRescueId).resolves(null); // Expect the findById method to be called with the mock rescue ID and resolve to null.

			const response = await request(app).get(`/api/rescue/${mockRescueId}`); // Perform a GET request to the /api/rescue/:id endpoint.

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

				const response = await request(app).get(
					`/api/rescue/filter?type=${type}`
				); // Test the filter endpoint with each type.

				rescueMock.verify(); // Verify that the mock expectations were met.

				expect(response.status).to.equal(200); // The response should have a status code of 200.
				expect(response.body.message).to.equal(
					`${type} rescues fetched successfully`
				); // The success message should reflect the rescue type.
				expect(response.body.data).to.deep.equal(mockRescues); // The data returned should match the mock rescues.
			});
		});
	});

	/**
	 * Test suite for creating an individual rescue entry.
	 */
	describe('POST /api/rescue/individual', () => {
		it('should create an individual rescue', async () => {
			const requestPayload = {
				rescueType: 'Individual',
				staff: [
					{
						userId: mockObjectId,
						permissions: [
							'edit_rescue_info',
							'add_pet',
							'delete_pet',
							'edit_pet',
							'see_messages',
							'send_messages',
						],
						verifiedByRescue: true,
					},
				],
			};

			const expectedRescue = {
				_id: 'newRescueId',
				...requestPayload,
			};

			rescueMock
				.expects('create')
				.withArgs(requestPayload)
				.resolves(expectedRescue); // Expect the Rescue model's create method to be called with the request payload.

			const res = await request(app)
				.post('/api/rescue/individual')
				.send(requestPayload) // Perform the POST request with the payload.
				.expect(201); // Expect a 201 status code for successful creation.

			expect(res.body.message).to.equal(
				'Individual rescue created successfully'
			); // Verify the success message.
			rescueMock.verify(); // Ensure the mock expectation was met.
		});

		it('should handle errors when creating individual rescue', async () => {
			// Simulate an error by not including required fields in the request.
			const res = await request(app)
				.post('/api/rescue/individual')
				.send({ userId: 'mockUserId' })
				.expect(400); // Expect a 400 status code for a bad request.

			// The error message should indicate the missing 'rescueType' field.
			expect(res.body.message).to.include('"rescueType" is required');
		});
	});

	/**
	 * Test suite for creating a charity rescue entry.
	 */
	describe('POST /api/rescue/charity', function () {
		this.timeout(10000);

		let saveStub;

		before(() => {
			// Stub the save method of the Rescue model to simulate database save operations.
			saveStub = sinon.stub(Rescue.prototype, 'save').resolves({
				rescueType: 'Charity',
				rescueName: 'Test Charity',
				rescueAddress: '123 Charity Lane',
				referenceNumber: 'CH12345678',
				referenceNumberVerified: false,
				staff: [
					{
						userId: 'user123',
						permissions: [
							'edit_rescue_info',
							'add_pet',
							'delete_pet',
							'edit_pet',
							'see_messages',
							'send_messages',
						],
						verifiedByRescue: true,
					},
				],
			});
		});

		after(() => {
			// Restore the stubbed method after the tests.
			saveStub.restore();
		});

		it('should create a new charity rescue with a valid charity register number and return a 201 status code', async () => {
			// Define the data for a new charity rescue.
			const rescueData = {
				rescueType: 'Charity',
				rescueName: 'Test Charity',
				rescueAddress: '123 Charity Lane',
				referenceNumber: process.env.VALID_CHARITY_REGISTER_NUMBER,
				userId: mockObjectId,
				staff: [
					{
						userId: mockObjectId,
						permissions: [
							'edit_rescue_info',
							'add_pet',
							'delete_pet',
							'edit_pet',
							'see_messages',
							'send_messages',
						],
						verifiedByRescue: true,
					},
				],
			};

			// Perform the POST request to create a new charity rescue.
			const response = await request(app)
				.post('/api/rescue/charity')
				.send(rescueData)
				.expect(201);

			// Check the response status code and message.
			expect(response.status).to.equal(201);
			expect(response.body.message).to.equal(
				'Charity rescue created successfully'
			);
			expect(response.body.data.referenceNumberVerified).to.be.true;
		});

		it('should return a 400 status code if required fields are missing', async () => {
			// Perform the POST request with incomplete data.
			const response = await request(app)
				.post('/api/rescue/charity')
				.send({})
				.expect(400);

			// The response should indicate that the 'rescueType' field is required.
			expect(response.body.message).to.include('"rescueType" is required');
		});

		it('should return a 400 status code if the referenceNumber is not unique', async () => {
			// Stub the isReferenceNumberUnique method to simulate a duplicate reference number.
			const isUniqueStub = sinon
				.stub(rescueService, 'isReferenceNumberUnique')
				.resolves(false);

			// Define the data for a charity rescue with a duplicate reference number.
			const duplicateData = {
				rescueType: 'Charity',
				rescueName: 'Another Test Chairty',
				rescueAddress: '456 Chairty Lane',
				referenceNumber: 'CH12345678',
				userId: mockObjectId,
				staff: [
					{
						userId: mockObjectId,
						permissions: [
							'edit_rescue_info',
							'add_pet',
							'delete_pet',
							'edit_pet',
							'see_messages',
							'send_messages',
						],
						verifiedByRescue: true,
					},
				],
			};

			// Perform the POST request with the duplicate data.
			const response = await request(app)
				.post('/api/rescue/charity')
				.send(duplicateData);

			// The response should indicate that the reference number already exists.
			expect(response.status).to.equal(400);
			expect(response.body.message).to.contain(
				'A rescue with the given reference number already exists'
			);

			// Verify that the isReferenceNumberUnique stub was called once.
			sinon.assert.calledOnce(isUniqueStub);
			isUniqueStub.restore(); // Restore the stubbed method after the test.
		});

		it('should create a new charity rescue without a valid reference number and return a 201 status code with referenceNumberVerified as false', async () => {
			// Define the data for a new charity rescue.
			const rescueData = {
				rescueType: 'Charity',
				rescueName: 'Test Charity',
				rescueAddress: '123 Charity Lane',
				referenceNumber: process.env.INVALID_CHARITY_REGISTER_NUMBER,
				userId: mockObjectId,
				staff: [
					{
						userId: mockObjectId,
						permissions: [
							'edit_rescue_info',
							'add_pet',
							'delete_pet',
							'edit_pet',
							'see_messages',
							'send_messages',
						],
						verifiedByRescue: true,
					},
				],
			};

			// Perform the POST request to create a new charity rescue.
			const response = await request(app)
				.post('/api/rescue/charity')
				.send(rescueData)
				.expect(201);

			// Check the response status code and message.
			expect(response.status).to.equal(201);
			expect(response.body.message).to.equal(
				'Charity rescue created successfully'
			);
			expect(response.body.data.referenceNumberVerified).to.be.false;
		});
	});

	/**
	 * Test suite for creating a company rescue entry.
	 */
	describe('POST /api/rescue/company', function () {
		this.timeout(5000);
		let saveStub;

		before(() => {
			// Stub the save method of the Rescue model to simulate database save operations for company rescues.
			saveStub = sinon.stub(Rescue.prototype, 'save').resolves({
				rescueType: 'Company',
				rescueName: 'Test Company',
				rescueAddress: '123 Company Lane',
				referenceNumber: 'COMP12345678',
				referenceNumberVerified: false,
				staff: [
					{
						userId: 'user123',
						permissions: [
							'edit_rescue_info',
							'add_pet',
							'delete_pet',
							'edit_pet',
							'see_messages',
							'send_messages',
						],
						verifiedByRescue: true,
					},
				],
			});
		});

		after(() => {
			// Restore the stubbed method after the tests.
			saveStub.restore();
		});

		it('should create a new company rescue and return a 201 status code', async () => {
			// Define the data for a new company rescue.
			const rescueData = {
				rescueType: 'Company',
				rescueName: 'Test Company',
				rescueAddress: '123 Company Lane',
				referenceNumber: '02953832',
				userId: mockObjectId,
				staff: [
					{
						userId: mockObjectId,
						permissions: [
							'edit_rescue_info',
							'add_pet',
							'delete_pet',
							'edit_pet',
							'see_messages',
							'send_messages',
						],
						verifiedByRescue: true,
					},
				],
			};

			// Perform the POST request to create a new company rescue.
			const response = await request(app)
				.post('/api/rescue/company')
				.send(rescueData);

			// Check the response status code and message.
			expect(response.status).to.equal(201);
			expect(response.body.message).to.equal(
				'Company rescue created successfully'
			);
			expect(response.body.data.referenceNumberVerified).to.be.true;
		});

		it('should return a 400 status code if required fields are missing', async () => {
			// Perform the POST request with incomplete data.
			const response = await request(app)
				.post('/api/rescue/company')
				.send({})
				.expect(400);

			// The response should indicate that the 'rescueType' field is required.
			expect(response.body.message).to.include('"rescueType" is required');
		});

		it('should return a 400 status code if the referenceNumber is not unique', async () => {
			// Stub the isReferenceNumberUnique method to simulate a duplicate reference number.
			const isUniqueStub = sinon
				.stub(rescueService, 'isReferenceNumberUnique')
				.resolves(false);

			// Define the data for a company rescue with a duplicate reference number.
			const duplicateData = {
				rescueType: 'Company',
				rescueName: 'Another Test Company',
				rescueAddress: '456 Company Lane',
				referenceNumber: 'COMP12345678',
				userId: mockObjectId,
				staff: [
					{
						userId: mockObjectId,
						permissions: [
							'edit_rescue_info',
							'add_pet',
							'delete_pet',
							'edit_pet',
							'see_messages',
							'send_messages',
						],
						verifiedByRescue: true,
					},
				],
			};

			// Perform the POST request with the duplicate data.
			const response = await request(app)
				.post('/api/rescue/company')
				.send(duplicateData);

			// The response should indicate that the reference number already exists.
			expect(response.status).to.equal(400);
			expect(response.body.message).to.contain(
				'A rescue with the given reference number already exists'
			);

			// Verify that the isReferenceNumberUnique stub was called once.
			sinon.assert.calledOnce(isUniqueStub);
			isUniqueStub.restore(); // Restore the stubbed method after the test.
		});

		it('should create a new company rescue without a valid reference number and return a 201 status code with referenceNumberVerified as false', async () => {
			// Define the data for a new charity rescue.
			const rescueData = {
				rescueType: 'Company',
				rescueName: 'Test Company',
				rescueAddress: '123 Company Lane',
				referenceNumber: '',
				userId: mockObjectId,
				staff: [
					{
						userId: mockObjectId,
						permissions: [
							'edit_rescue_info',
							'add_pet',
							'delete_pet',
							'edit_pet',
							'see_messages',
							'send_messages',
						],
						verifiedByRescue: true,
					},
				],
			};

			// Perform the POST request to create a new charity rescue.
			const response = await request(app)
				.post('/api/rescue/company')
				.send(rescueData)
				.expect(201);

			// Check the response status code and message.
			expect(response.status).to.equal(201);
			expect(response.body.message).to.equal(
				'Company rescue created successfully'
			);
			expect(response.body.data.referenceNumberVerified).to.be.false;
		});
	});

	/**
	 * Test suite for updating rescue information by ID.
	 * It tests various scenarios including successful updates, handling of non-existent rescues,
	 * validation of rescue IDs, and permission checks for editing rescues.
	 */
	describe('PUT /api/rescue/:rescueId', function () {
		let cookie, existingRescueId, jwtVerifyStub;

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
					callback(null, { userId: 'mockUserId', isAdmin: false });
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
								userId: 'mockUserId',
								permissions: ['edit_rescue_info'],
								verifiedByRescue: true,
							},
							{
								userId: 'mockUserIdNoPerms',
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
			const validUpdateBody = { rescueName: 'Updated Name' };

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
					callback(null, { userId: 'mockUserIdNoPerms', isAdmin: false });
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
	describe('PUT /api/rescue/:rescueId/staff', function () {
		let cookie, existingRescueId, editorUserId, jwtVerifyStub;

		// Setup before each test: resets stubs, prepares authentication and mocks retrieval of a rescue by ID.
		beforeEach(async () => {
			sinon.restore();
			const token = 'dummyToken';
			cookie = `token=${token};`;
			existingRescueId = generateObjectId();
			editorUserId = generateObjectId(); // Mock editor user ID

			// Stub JWT verification to simulate an authenticated user session.
			jwtVerifyStub = sinon
				.stub(jwt, 'verify')
				.callsFake((token, secret, callback) => {
					callback(null, { userId: editorUserId.toString(), isAdmin: false });
				});

			// Stub the Rescue.findById method to simulate database lookup.
			sinon.stub(Rescue, 'findById').callsFake((id) => {
				if (id.toString() === existingRescueId.toString()) {
					return Promise.resolve({
						_id: existingRescueId,
						staff: [
							{
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

		// Cleanup after each test.
		afterEach(() => {
			if (jwtVerifyStub && jwtVerifyStub.restore) {
				jwtVerifyStub.restore();
			}
		});

		// Tests for various scenarios including rescue not found, unauthorized access, updating, and adding staff members.
		it('should return a 404 if the rescue is not found', async function () {
			const nonExistingRescueId = generateObjectId();

			const response = await request(app)
				.put(`/api/rescue/${nonExistingRescueId}/staff`)
				.set('Cookie', cookie)
				.send({ userId: editorUserId, permissions: ['edit_rescue_info'] })
				.expect(404);

			expect(response.body.message).to.equal('Rescue not found');
		});

		it('should return a 403 if the user does not have permission to edit staff', async function () {
			const nonEditorUserId = generateObjectId(); // A different user without edit permissions
			jwtVerifyStub.restore(); // Restore to redefine behavior
			jwtVerifyStub = sinon
				.stub(jwt, 'verify')
				.callsFake((token, secret, callback) => {
					callback(null, {
						userId: nonEditorUserId.toString(),
						isAdmin: false,
					});
				});

			const response = await request(app)
				.put(`/api/rescue/${existingRescueId}/staff`)
				.set('Cookie', cookie)
				.send({ userId: generateObjectId(), permissions: ['edit_rescue_info'] })
				.expect(403);

			expect(response.body.message).to.equal('No permission to edit staff');
		});

		it('should successfully update an existing staff member', async function () {
			const staffUserId = editorUserId; // Assuming the editor updates their own permissions
			const updatedPermissions = ['edit_rescue_info', 'add_staff'];

			const response = await request(app)
				.put(`/api/rescue/${existingRescueId}/staff`)
				.set('Cookie', cookie)
				.send({ userId: staffUserId, permissions: updatedPermissions })
				.expect(200);

			expect(response.body.message).to.equal('Staff updated successfully');
			expect(response.body.data).to.satisfy((staff) =>
				staff.some(
					(member) =>
						member.userId.toString() === staffUserId.toString() &&
						member.permissions.includes('add_staff')
				)
			);
		});

		it('should successfully add a new staff member', async function () {
			const newStaffUserId = generateObjectId();
			const permissions = ['see_messages'];

			const response = await request(app)
				.put(`/api/rescue/${existingRescueId}/staff`)
				.set('Cookie', cookie)
				.send({ userId: newStaffUserId, permissions })
				.expect(200);

			expect(response.body.message).to.equal('Staff updated successfully');
			expect(response.body.data).to.satisfy((staff) =>
				staff.some(
					(member) => member.userId.toString() === newStaffUserId.toString()
				)
			);
		});
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
								verifiedByRescue: false,
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
					callback(null, { userId: userIdNonEdit.toString(), isAdmin: false });
				});

			const response = await request(app)
				.put(`/api/rescue/${rescueId}/staff/${staffIdNonEdit}/verify`)
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
				.put(`/api/rescue/${rescueId}/staff/${staffId}/verify`)
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
});
