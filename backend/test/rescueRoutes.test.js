import request from 'supertest';
import sinon from 'sinon';
import express from 'express';
import { expect } from 'chai';
import Rescue from '../models/Rescue.js'; // Adjust the path as necessary
import rescueRoutes from '../routes/rescueRoutes.js'; // Adjust the path as necessary
import { connectToDatabase, disconnectFromDatabase } from './database.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import authenticateToken from '../middleware/authenticateToken.js';
import rescueService from '../services/rescueService.js';

const app = express();
app.use(express.json());
app.use('/api/rescue', rescueRoutes);

describe('Rescue Routes', function () {
	let rescueMock;

	beforeEach(async () => {
		await connectToDatabase();
		// Stub Rescue model methods
		rescueMock = sinon.mock(Rescue);
		sinon.restore();
	});

	afterEach(async () => {
		// Restore all stubs, mocks, and spies
		await disconnectFromDatabase();
		// rescueMock.restore();
		sinon.restore();
	});

	describe('GET /api/rescue', () => {
		it('should fetch all rescues', async function () {
			// Mock data to return
			const mockRescues = [
				{ rescueType: 'Individual', rescueName: 'Test Rescue 1' },
				{ rescueType: 'Charity', rescueName: 'Test Rescue 2' },
			];

			// Set up expectations
			rescueMock.expects('find').withArgs({}).resolves(mockRescues);

			// Make a GET request using supertest
			const response = await request(app).get('/api/rescue');

			// Assertions to verify that the expectations were met
			rescueMock.verify();

			// Additional assertions on the response
			expect(response.status).to.equal(200);
			expect(response.body.message).to.equal('Rescues fetched successfully');
			expect(response.body.data).to.deep.equal(mockRescues);
		});
	});

	describe('GET /api/rescue/:id', () => {
		it('should fetch a specific rescue by id', async function () {
			// Mock rescue ID and data to return
			const mockRescueId = 'someRescueId';
			const mockRescueData = {
				_id: mockRescueId,
				rescueType: 'Charity',
				rescueName: 'Specific Test Rescue',
			};

			// Set up expectations
			rescueMock
				.expects('findById')
				.withArgs(mockRescueId)
				.resolves(mockRescueData);

			// Make a GET request using supertest
			const response = await request(app).get(`/api/rescue/${mockRescueId}`);

			// Assertions to verify that the expectations were met
			rescueMock.verify();

			// Additional assertions on the response
			expect(response.status).to.equal(200);
			expect(response.body.message).to.equal('Rescue fetched successfully');
			expect(response.body.data).to.deep.equal(mockRescueData);
		});

		it('should return a 404 status code if the rescue does not exist', async function () {
			// Mock a rescue ID for a non-existent rescue
			const mockRescueId = 'nonExistentRescueId';

			// Set up expectations
			rescueMock.expects('findById').withArgs(mockRescueId).resolves(null);

			// Make a GET request using supertest
			const response = await request(app).get(`/api/rescue/${mockRescueId}`);

			// Assertions to verify that the expectations were met
			rescueMock.verify();

			// Additional assertions on the response
			expect(response.status).to.equal(404);
			expect(response.body.message).to.equal('Rescue not found');
		});
	});

	describe('GET /api/rescue/filter', () => {
		//
		it('should fetch all Individual rescues', async function () {
			const type = 'Individual';
			const mockRescues = [
				{ rescueType: type, rescueName: 'Test Individual 1' },
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
		//
		it('should fetch all Charity rescues', async function () {
			const type = 'Charity';
			const mockRescues = [{ rescueType: type, rescueName: 'Test Charity 1' }];

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
		//
		it('should fetch all Company rescues', async function () {
			const type = 'Company';
			const mockRescues = [{ rescueType: type, rescueName: 'Test Company 1' }];

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

	describe('POST /api/rescue/individual', () => {
		it('should create an individual rescue', async () => {
			const userId = 'mockUserId'; // Adjust as needed

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
				.resolves({
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
				});

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
			const userId = 'mockUserId'; // Adjust as needed

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

	describe('POST /api/rescue/charity endpoint', function () {
		beforeEach(() => {
			// Stub the save method for Rescue model to simulate saving
			sinon.stub(Rescue.prototype, 'save').resolves({
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

		afterEach(() => {
			afterEach(() => {
				if (Rescue.prototype.save.restore) {
					Rescue.prototype.save.restore();
				}
			});
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
				// Missing 'rescueName', 'rescueAddress', and 'referenceNumber'
				userId: 'user123',
			};

			const response = await request(app)
				.post('/api/rescue/charity')
				.send(incompleteData);

			expect(response.status).to.equal(400);
			expect(response.body.message).to.include('Missing required fields');
		});

		// TODO: Implement validation checks
		// it('should return a 400 status code if the input data types are incorrect', async () => {
		// 	const invalidDataTypeData = {
		// 		rescueName: [4.59], // Should be a string
		// 		rescueAddress: '123 Charity Lane',
		// 		referenceNumber: 'CH12345678',
		// 		userId: 'user123',
		// 	};

		// 	const response = await request(app)
		// 		.post('/api/rescue/charity')
		// 		.send(invalidDataTypeData);

		// 	expect(response.status).to.equal(400);
		// 	expect(response.body.message).to.include(
		// 		'A rescue with the given reference number already exists'
		// 	);
		// });

		it('should return a 400 status code if the referenceNumber is not unique', async () => {
			// Mock the uniqueness check to always return false (indicating not unique)
			const isUniqueStub = sinon
				.stub(rescueService, 'isReferenceNumberUnique')
				.resolves(false);

			const duplicateData = {
				rescueName: 'Another Test Charity',
				rescueAddress: '456 Charity Lane',
				referenceNumber: 'CH12345678', // Assuming this is not unique
				userId: 'user456',
			};

			// Using supertest to test the endpoint
			const response = await request(app)
				.post('/api/rescue/charity')
				.send(duplicateData);

			expect(response.status).to.equal(400);
			expect(response.body.message).to.contain(
				'A rescue with the given reference number already exists'
			);

			// Verify the stub was called correctly
			sinon.assert.calledOnce(isUniqueStub);

			// Restore the stubbed method to its original method
			isUniqueStub.restore();
		});
	});

	describe('POST /api/rescue/company endpoint', function () {
		beforeEach(() => {
			// Stub the save method for Rescue model to simulate saving
			sinon.stub(Rescue.prototype, 'save').resolves({
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

		afterEach(() => {
			afterEach(() => {
				if (Rescue.prototype.save.restore) {
					Rescue.prototype.save.restore();
				}
			});
		});

		it('should create a new charity rescue and return a 201 status code', async () => {
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
				// Missing 'rescueName', 'rescueAddress', and 'referenceNumber'
				userId: 'user123',
			};

			const response = await request(app)
				.post('/api/rescue/company')
				.send(incompleteData);

			expect(response.status).to.equal(400);
			expect(response.body.message).to.include('Missing required fields');
		});

		// TODO: Implement validation checks
		// it('should return a 400 status code if the input data types are incorrect', async () => {
		// 	const invalidDataTypeData = {
		// 		rescueName: [4.59], // Should be a string
		// 		rescueAddress: '123 Charity Lane',
		// 		referenceNumber: 'CH12345678',
		// 		userId: 'user123',
		// 	};

		// 	const response = await request(app)
		// 		.post('/api/rescue/charity')
		// 		.send(invalidDataTypeData);

		// 	expect(response.status).to.equal(400);
		// 	expect(response.body.message).to.include(
		// 		'A rescue with the given reference number already exists'
		// 	);
		// });

		it('should return a 400 status code if the referenceNumber is not unique', async () => {
			// Mock the uniqueness check to always return false (indicating not unique)
			const isUniqueStub = sinon
				.stub(rescueService, 'isReferenceNumberUnique')
				.resolves(false);

			const duplicateData = {
				rescueName: 'Another Test Company',
				rescueAddress: '456 Company Lane',
				referenceNumber: 'COMP12345678', // Assuming this is not unique
				userId: 'user456',
			};

			// Using supertest to test the endpoint
			const response = await request(app)
				.post('/api/rescue/charity')
				.send(duplicateData);

			expect(response.status).to.equal(400);
			expect(response.body.message).to.contain(
				'A rescue with the given reference number already exists'
			);

			// Verify the stub was called correctly
			sinon.assert.calledOnce(isUniqueStub);

			// Restore the stubbed method to its original method
			isUniqueStub.restore();
		});
	});

	//
	describe('PUT /api/rescue/:rescueId', function () {});
});
