import request from 'supertest';
import sinon from 'sinon';
import express from 'express';
import { expect } from 'chai';
import Rescue from '../models/Rescue.js';
import rescueRoutes from '../routes/rescueRoutes.js';
import { connectToDatabase, disconnectFromDatabase } from './database.js';
import mongoose from 'mongoose';
import rescueService from '../services/rescueService.js';
import app from '../index.js';

const mockObjectId = '65f1fa2aadeb2ca9f053f7f8';

describe('Rescue Routes', function () {
	let rescueMock;

	beforeEach(async () => {
		await connectToDatabase();
		rescueMock = sinon.mock(Rescue);
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
});
