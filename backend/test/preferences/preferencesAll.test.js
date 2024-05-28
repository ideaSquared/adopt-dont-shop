import { expect } from 'chai';
import sinon from 'sinon';
import supertest from 'supertest';
import { pool } from '../../dbConnection.js'; // Adjust as necessary
import app from '../../index.js'; // Adjust as necessary
import jwt from 'jsonwebtoken';

const request = supertest(app);

describe('Preferences Service', () => {
	let sandbox, userToken, adminToken, cookie, adminCookie;

	beforeEach(() => {
		sandbox = sinon.createSandbox();
		sandbox.stub(pool, 'query');

		const secret = process.env.SECRET_KEY;

		// Non-admin user payload and token
		const userPayload = { userId: 'testUserId', isAdmin: false };
		userToken = jwt.sign(userPayload, secret, { expiresIn: '1h' });
		cookie = `token=${userToken};`;

		// Admin user payload and token
		const adminPayload = { userId: 'testAdminId', isAdmin: true };
		adminToken = jwt.sign(adminPayload, secret, { expiresIn: '1h' });
		adminCookie = `token=${adminToken};`;
	});

	afterEach(() => {
		sinon.restore();
		sandbox.restore();
	});

	describe('POST /', () => {
		it('should create a new preference successfully', async () => {
			const preference = {
				preferenceKey: 'other_pets',
				preferenceValue: 'prefers_only_pet_household',
			};
			const mockResponse = { id: 1, user_id: 'testUserId', ...preference };
			pool.query.resolves({ rows: [mockResponse], rowCount: 1 });

			const response = await request
				.post('/api/preferences')
				.send(preference)
				.set('Cookie', cookie);

			expect(response.status).to.equal(201);
			expect(response.body).to.deep.equal(mockResponse);
		});

		it('should handle errors appropriately when insertion fails', async () => {
			pool.query.rejects(new Error('Database error'));
			const preference = {
				preferenceKey: 'other_pets',
				preferenceValue: 'prefers_only_pet_household',
			};

			const response = await request
				.post('/api/preferences')
				.send(preference)
				.set('Cookie', cookie);

			expect(response.status).to.equal(500);
			expect(response.body.message).to.equal('Failed to add preference');
		});

		it('should return 400 if the preference key is invalid', async () => {
			const preference = {
				preferenceKey: 'invalid_key',
				preferenceValue: 'prefers_only_pet_household',
			};

			const response = await request
				.post('/api/preferences')
				.send(preference)
				.set('Cookie', cookie);

			expect(response.status).to.equal(400);
			expect(response.body.message).to.equal(
				'Invalid preference category (invalid_key) or value (prefers_only_pet_household)'
			);
		});

		it('should return 400 if the preference value is invalid', async () => {
			const preference = {
				preferenceKey: 'other_pets',
				preferenceValue: 'invalid_value',
			};

			const response = await request
				.post('/api/preferences')
				.send(preference)
				.set('Cookie', cookie);

			expect(response.status).to.equal(400);
			expect(response.body.message).to.equal(
				'Invalid preference category (other_pets) or value (invalid_value)'
			);
		});
	});

	describe('PUT /:id', () => {
		it('should update an existing preference successfully', async () => {
			const preferenceId = 1;
			const updatedPreference = {
				preferenceKey: 'other_pets',
				preferenceValue: 'can_adapt_if_alone',
			};
			const mockResponse = {
				id: preferenceId,
				user_id: 'testUserId',
				...updatedPreference,
			};
			pool.query.resolves({ rows: [mockResponse], rowCount: 1 });

			const response = await request
				.put(`/api/preferences/${preferenceId}`)
				.send(updatedPreference)
				.set('Cookie', cookie);

			expect(response.status).to.equal(200);
			expect(response.body).to.deep.equal(mockResponse);
		});

		it('should return 404 if the preference does not exist', async () => {
			const preferenceId = 999; // Non-existing ID
			pool.query.resolves({ rowCount: 0 });

			const response = await request
				.put(`/api/preferences/${preferenceId}`)
				.send({
					preferenceKey: 'other_pets',
					preferenceValue: 'can_adapt_if_alone',
				})
				.set('Cookie', cookie);

			expect(response.status).to.equal(404);
			expect(response.body.message).to.equal('Preference not found');
		});

		it('should return 400 if the preference key is invalid', async () => {
			const preferenceId = 1;
			const updatedPreference = {
				preferenceKey: 'invalid_key',
				preferenceValue: 'can_adapt_if_alone',
			};

			const response = await request
				.put(`/api/preferences/${preferenceId}`)
				.send(updatedPreference)
				.set('Cookie', cookie);

			expect(response.status).to.equal(400);
			expect(response.body.message).to.equal(
				'Invalid preference category or value'
			);
		});

		it('should return 400 if the preference value is invalid', async () => {
			const preferenceId = 1;
			const updatedPreference = {
				preferenceKey: 'other_pets',
				preferenceValue: 'invalid_value',
			};

			const response = await request
				.put(`/api/preferences/${preferenceId}`)
				.send(updatedPreference)
				.set('Cookie', cookie);

			expect(response.status).to.equal(400);
			expect(response.body.message).to.equal(
				'Invalid preference category or value'
			);
		});
	});

	describe('DELETE /:id', () => {
		it('should delete a preference successfully', async () => {
			const preferenceId = 1;
			const mockResponse = {
				id: preferenceId,
				preferenceKey: 'other_pets',
				preferenceValue: 'prefers_only_pet_household',
			};
			pool.query.resolves({ rows: [mockResponse], rowCount: 1 });

			const response = await request
				.delete(`/api/preferences/${preferenceId}`)
				.set('Cookie', cookie);

			expect(response.status).to.equal(200);
			expect(response.body.message).to.equal('Preference deleted');
			expect(response.body.deletedPreference).to.deep.equal(mockResponse);
		});

		it('should return 404 if the preference does not exist', async () => {
			const preferenceId = 999; // Non-existing ID
			pool.query.resolves({ rowCount: 0 });

			const response = await request
				.delete(`/api/preferences/${preferenceId}`)
				.set('Cookie', cookie);

			expect(response.status).to.equal(404);
			expect(response.body.message).to.equal('Preference not found');
		});
	});

	describe('GET /', () => {
		it('should retrieve all preferences successfully for an admin', async () => {
			const mockPreferences = [
				{
					id: 1,
					user_id: 'testUserId',
					preferenceKey: 'other_pets',
					preferenceValue: 'prefers_only_pet_household',
				},
				{
					id: 2,
					user_id: 'testUserId2',
					preferenceKey: 'energy',
					preferenceValue: 'full_of_energy',
				},
			];
			pool.query.resolves({
				rows: mockPreferences,
				rowCount: mockPreferences.length,
			});

			const response = await request
				.get('/api/preferences')
				.set('Cookie', adminCookie);

			expect(response.status).to.equal(200);
			expect(response.body).to.deep.equal(mockPreferences);
		});

		it('should handle errors appropriately when retrieval fails', async () => {
			pool.query.rejects(new Error('Database error'));

			const response = await request
				.get('/api/preferences')
				.set('Cookie', adminCookie);

			expect(response.status).to.equal(500);
			expect(response.body.message).to.equal('Failed to get preferences');
		});
	});

	describe('GET /user', () => {
		it('should retrieve all preferences for the authenticated user successfully', async () => {
			const mockPreferences = [
				{
					id: 1,
					user_id: 'testUserId',
					preferenceKey: 'other_pets',
					preferenceValue: 'prefers_only_pet_household',
				},
				{
					id: 2,
					user_id: 'testUserId',
					preferenceKey: 'energy',
					preferenceValue: 'full_of_energy',
				},
			];
			pool.query.resolves({
				rows: mockPreferences,
				rowCount: mockPreferences.length,
			});

			const response = await request
				.get('/api/preferences/user')
				.set('Cookie', cookie);

			expect(response.status).to.equal(200);
			expect(response.body).to.deep.equal(mockPreferences);
		});

		it('should handle errors appropriately when retrieval fails', async () => {
			pool.query.rejects(new Error('Database error'));

			const response = await request
				.get('/api/preferences/user')
				.set('Cookie', cookie);

			expect(response.status).to.equal(500);
			expect(response.body.message).to.equal('Failed to get preferences');
		});
	});
});
