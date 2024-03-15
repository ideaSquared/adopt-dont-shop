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

describe('Rescue Routes', function () {
	let rescueMock;

	beforeEach(async () => {
		await connectToDatabase();
		rescueMock = sinon.mock(Rescue);
		sinon.stub(jwt, 'verify'); // Globally stub jwt.verify to configure in each context
	});

	afterEach(async () => {
		await disconnectFromDatabase();
		rescueMock.restore();
		sinon.restore();
	});

	describe('GET /api/rescue', () => {
		it('should fetch all rescues', async function () {
			const mockRescues = [
				{ rescueType: 'Individual', rescueName: 'Test Rescue 1' },
				{ rescueType: 'Charity', rescueName: 'Test Rescue 2' },
			];

			rescueMock.expects('find').withArgs({}).resolves(mockRescues);

			const response = await request(app).get('/api/rescue');

			rescueMock.verify();

			expect(response.status).to.equal(200);
			expect(response.body.message).to.equal('Rescues fetched successfully');
			expect(response.body.data).to.deep.equal(mockRescues);
		});
	});

	describe('GET /api/rescue/:id', () => {
		it('should fetch a specific rescue by id', async function () {
			const mockRescueId = mockObjectId;
			const mockRescueData = {
				_id: mockRescueId,
				rescueType: 'Charity',
				rescueName: 'Specific Test Rescue',
			};

			rescueMock
				.expects('findById')
				.withArgs(mockRescueId)
				.resolves(mockRescueData);

			const response = await request(app).get(`/api/rescue/${mockRescueId}`);

			rescueMock.verify();

			expect(response.status).to.equal(200);
			expect(response.body.message).to.equal('Rescue fetched successfully');
			expect(response.body.data).to.deep.equal(mockRescueData);
		});

		it('should return a 404 status code if the rescue does not exist', async function () {
			const mockRescueId = mockObjectId;

			rescueMock.expects('findById').withArgs(mockRescueId).resolves(null);

			const response = await request(app).get(`/api/rescue/${mockRescueId}`);

			rescueMock.verify();

			expect(response.status).to.equal(404);
			expect(response.body.message).to.equal('Rescue not found');
		});
	});

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
					.resolves(mockRescues);

				const response = await request(app).get(
					`/api/rescue/filter?type=${type}`
				);

				rescueMock.verify();

				expect(response.status).to.equal(200);
				expect(response.body.message).to.equal(
					`${type} rescues fetched successfully`
				);
				expect(response.body.data).to.deep.equal(mockRescues);
			});
		});
	});

	describe('POST /api/rescue/individual', () => {
		it('should create an individual rescue', async () => {
			const userId = 'mockUserId';

			const expectedRescue = {
				_id: 'newRescueId',
				rescueType: 'Individual',
				staff: [
					{
						userId,
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

			rescueMock
				.expects('create')
				.withArgs({
					rescueType: 'Individual',
					staff: [
						{
							userId,
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
				})
				.resolves(expectedRescue);

			const res = await request(app)
				.post('/api/rescue/individual')
				.send({ userId })
				.expect(201);

			expect(res.body).to.have.property(
				'message',
				'Individual rescue created successfully'
			);
			rescueMock.verify();
		});

		it('should handle errors when creating individual rescue', async () => {
			const userId = 'mockUserId';

			rescueMock
				.expects('create')
				.withArgs({
					rescueType: 'Individual',
					staff: [
						{
							userId,
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
				})
				.rejects(new Error('Failed to create individual rescue'));

			const res = await request(app)
				.post('/api/rescue/individual')
				.send({ userId })
				.expect(400);

			expect(res.body).to.have.property(
				'message',
				'Failed to create individual rescue'
			);
			rescueMock.verify();
		});
	});

	describe('POST /api/rescue/charity', function () {
		let saveStub;

		before(() => {
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
			saveStub.restore();
		});

		it('should create a new charity rescue and return a 201 status code', async () => {
			const rescueData = {
				rescueName: 'Test Charity',
				rescueAddress: '123 Charity Lane',
				referenceNumber: 'CH12345678',
				userId: 'user123',
			};

			const response = await request(app)
				.post('/api/rescue/charity')
				.send(rescueData);

			expect(response.status).to.equal(201);
			expect(response.body.message).to.equal(
				'Charity rescue created successfully'
			);
		});

		it('should return a 400 status code if required fields are missing', async () => {
			const incompleteData = {
				userId: 'user123',
			};

			const response = await request(app)
				.post('/api/rescue/charity')
				.send(incompleteData);

			expect(response.status).to.equal(400);
			expect(response.body.message).to.include('Missing required fields');
		});

		it('should return a 400 status code if the referenceNumber is not unique', async () => {
			const isUniqueStub = sinon
				.stub(rescueService, 'isReferenceNumberUnique')
				.resolves(false);

			const duplicateData = {
				rescueName: 'Another Test Charity',
				rescueAddress: '456 Charity Lane',
				referenceNumber: 'CH12345678',
				userId: 'user456',
			};

			const response = await request(app)
				.post('/api/rescue/charity')
				.send(duplicateData);

			expect(response.status).to.equal(400);
			expect(response.body.message).to.contain(
				'A rescue with the given reference number already exists'
			);

			sinon.assert.calledOnce(isUniqueStub);
			isUniqueStub.restore();
		});
	});

	describe('POST /api/rescue/company', function () {
		let saveStub;

		before(() => {
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
			saveStub.restore();
		});

		it('should create a new company rescue and return a 201 status code', async () => {
			const rescueData = {
				rescueName: 'Test Company',
				rescueAddress: '123 Company Lane',
				referenceNumber: 'COMP12345678',
				userId: 'user123',
			};

			const response = await request(app)
				.post('/api/rescue/company')
				.send(rescueData);

			expect(response.status).to.equal(201);
			expect(response.body.message).to.equal(
				'Company rescue created successfully'
			);
		});

		it('should return a 400 status code if required fields are missing', async () => {
			const incompleteData = {
				userId: 'user123',
			};

			const response = await request(app)
				.post('/api/rescue/company')
				.send(incompleteData);

			expect(response.status).to.equal(400);
			expect(response.body.message).to.include('Missing required fields');
		});

		it('should return a 400 status code if the referenceNumber is not unique', async () => {
			const isUniqueStub = sinon
				.stub(rescueService, 'isReferenceNumberUnique')
				.resolves(false);

			const duplicateData = {
				rescueName: 'Another Test Company',
				rescueAddress: '456 Company Lane',
				referenceNumber: 'COMP12345678',
				userId: 'user456',
			};

			const response = await request(app)
				.post('/api/rescue/company')
				.send(duplicateData);

			expect(response.status).to.equal(400);
			expect(response.body.message).to.contain(
				'A rescue with the given reference number already exists'
			);

			sinon.assert.calledOnce(isUniqueStub);
			isUniqueStub.restore();
		});
	});

	describe('PUT /api/rescue/:rescueId', function () {
		let cookie, existingRescueId, jwtVerifyStub;

		beforeEach(() => {
			// Reset Sinon sandbox or restore individual stubs/spies to their original methods
			sinon.restore();

			const token = 'dummyToken';
			cookie = `token=${token};`;

			// Stub the jwt.verify method specifically for this set of tests
			jwtVerifyStub = sinon
				.stub(jwt, 'verify')
				.callsFake((token, secret, callback) => {
					callback(null, { userId: 'mockUserId', isAdmin: false });
				});

			// Generate a mock rescue ID that would exist in the database
			existingRescueId = generateObjectId();

			sinon.stub(Rescue, 'findById').callsFake((id) => {
				if (id.toString() === existingRescueId.toString()) {
					return Promise.resolve({
						_id: existingRescueId,
						rescueName: 'Existing Name',
						// Mock the staff array to prevent TypeError during .some call
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
			// Restore stubs and mocks after each test to clean up
			if (jwtVerifyStub && jwtVerifyStub.restore) {
				jwtVerifyStub.restore();
			}
		});

		it('should return a 404 if the rescue is not found', async function () {
			const nonExistingRescueId = generateObjectId();

			const response = await request(app)
				.put(`/api/rescue/${nonExistingRescueId}`)
				.set('Cookie', cookie)
				.send({ rescueName: 'New Name' })
				.expect(404);

			expect(response.body.message).to.equal('Rescue not found');
		});

		it('should successfully update a rescue with valid data', async function () {
			const validUpdateBody = { rescueName: 'Updated Name' }; // Assume the rescue accepts a 'rescueName' field for updates

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

		it('should return a 400 for an invalid rescue ID', async function () {
			const invalidRescueId = 'invalidId';

			const response = await request(app)
				.put(`/api/rescue/${invalidRescueId}`)
				.set('Cookie', cookie)
				.send({ rescueName: 'New Name' })
				.expect(400);

			expect(response.body.message).to.equal('Invalid rescue ID');
		});

		it('should return a 403 if the user does not have permission to edit', async function () {
			if (jwtVerifyStub && jwtVerifyStub.restore) {
				jwtVerifyStub.restore();
			}
			jwtVerifyStub = sinon
				.stub(jwt, 'verify')
				.callsFake((token, secret, callback) => {
					callback(null, { userId: 'mockUserIdNoPerms', isAdmin: false });
				});

			// Assuming the jwt.verify callFake is set up to mimic a user without edit permissions
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

	describe('PUT /api/rescue/:rescueId/staff', function () {
		let cookie, existingRescueId, editorUserId, jwtVerifyStub;

		beforeEach(async () => {
			sinon.restore();
			const token = 'dummyToken';
			cookie = `token=${token};`;
			existingRescueId = generateObjectId();
			editorUserId = generateObjectId(); // Mock editor user ID

			jwtVerifyStub = sinon
				.stub(jwt, 'verify')
				.callsFake((token, secret, callback) => {
					callback(null, { userId: editorUserId.toString(), isAdmin: false });
				});

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

		afterEach(() => {
			if (jwtVerifyStub && jwtVerifyStub.restore) {
				jwtVerifyStub.restore();
			}
		});

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

	describe('PUT /api/rescue/:rescueId/staff/:staffId/verify', function () {
		let cookie,
			rescueId,
			staffId,
			staffIdNonEdit,
			userId,
			userIdNonEdit,
			jwtVerifyStub;

		beforeEach(async () => {
			sinon.restore();
			const token = 'dummyToken';
			cookie = `token=${token};`;
			rescueId = generateObjectId();
			staffId = generateObjectId();
			staffIdNonEdit = generateObjectId();
			userId = generateObjectId(); // Mock user ID
			userIdNonEdit = generateObjectId();

			jwtVerifyStub = sinon
				.stub(jwt, 'verify')
				.callsFake((token, secret, callback) => {
					callback(null, { userId: userId.toString(), isAdmin: false });
				});

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

		afterEach(() => {
			if (jwtVerifyStub && jwtVerifyStub.restore) {
				jwtVerifyStub.restore();
			}
		});

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
			// Simulate an error scenario by throwing an error in the findById stub
			Rescue.findById.restore(); // Restore original stub
			sinon.stub(Rescue, 'findById').throws(new Error('Unexpected error'));

			const response = await request(app)
				.put(`/api/rescue/${rescueId}/staff/${staffId}/verify`)
				.set('Cookie', cookie)
				.expect(500);

			expect(response.body.message).to.equal('Failed to verify staff');
		});
	});
});
