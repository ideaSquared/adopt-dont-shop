import request from 'supertest';
import sinon from 'sinon';
import jwt from 'jsonwebtoken';
import { expect } from 'chai';
import app from '../index.js'; // Your Express application
import Rescue from '../models/Rescue.js';
import { connectToDatabase, disconnectFromDatabase } from './database.js';
import { generateObjectId } from '../utils/generateObjectId.js'; // Utility function to generate valid MongoDB ObjectIds
import Pet from '../models/Pet.js'; // Adjust the path according to your project structure

describe('Pet Creation Routes', function () {
	let adminUserId, staffUserId, nonStaffUserId, rescueId, cookie;

	before(async () => {
		await connectToDatabase();
		adminUserId = generateObjectId();
		staffUserId = generateObjectId();
		nonStaffUserId = generateObjectId();
		rescueId = generateObjectId();
		sinon.stub(jwt, 'verify');
	});

	after(async () => {
		await disconnectFromDatabase();
		sinon.restore();
	});

	beforeEach(function () {
		sinon.resetBehavior();
		sinon.resetHistory();
	});

	context('as staff of the rescue', function () {
		beforeEach(function () {
			jwt.verify.callsFake((token, secret, callback) => {
				callback(null, { userId: staffUserId, isAdmin: false });
			});

			sinon.stub(Rescue, 'find').resolves([
				{
					staff: [
						{
							userId: staffUserId,
							permissions: ['add_pet', 'edit_pet', 'delete_pet'],
						},
					],
				},
			]);

			const token = 'dummyToken'; // Simulate an auth token.
			cookie = `token=${token};`; // Simulate a browser cookie containing the auth token.
		});

		afterEach(function () {
			if (Rescue.find.restore) {
				Rescue.find.restore();
			}
		});

		describe('POST /api/pets/', function () {
			it('should allow pet creation for staff members with all required fields', async function () {
				const petData = {
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
				};

				const response = await request(app)
					.post('/api/pets')
					.set('Cookie', cookie) // Use the simulated auth cookie for authentication
					.send(petData)
					.expect(201); // Expecting the creation to be successful

				expect(response.body.message).to.equal('Pet created successfully');
			});
		});

		describe('DELETE /api/pets/:id', function () {
			let petIdToDelete;

			beforeEach(async function () {
				// Assuming jwt.verify is already stubbed from the previous context.
				// Setup a mock pet ID to delete.
				petIdToDelete = generateObjectId();

				// Stub the Pet model's findByIdAndDelete method.
				sinon.stub(Pet, 'findByIdAndDelete').callsFake((id) => {
					if (id.toString() === petIdToDelete.toString()) {
						return Promise.resolve({ _id: id });
					}
					return Promise.resolve(null);
				});
			});

			afterEach(function () {
				// Restore the stubbed method after each test.
				Pet.findByIdAndDelete.restore();
			});

			it('should allow pet deletion for staff members with permission', async function () {
				const response = await request(app)
					.delete(`/api/pets/${petIdToDelete}`)
					.set('Cookie', cookie) // Use the simulated auth cookie for authentication
					.expect(200); // Expecting the deletion to be successful

				expect(response.body.message).to.equal('Pet deleted successfully');
			});
		});

		describe('PUT /api/pets/:id', function () {
			let petToUpdateId, updatedPetData;

			beforeEach(async function () {
				petToUpdateId = generateObjectId();

				updatedPetData = {
					petName: 'Updated Name',
					age: 5,
				};

				sinon
					.stub(Pet, 'findByIdAndUpdate')
					.callsFake((id, update, options) => {
						if (id.toString() === petToUpdateId.toString()) {
							return Promise.resolve({ _id: id, ...updatedPetData });
						}
						return Promise.resolve(null);
					});
			});

			afterEach(function () {
				Pet.findByIdAndUpdate.restore();
			});

			it('should allow pet update for staff members with permission', async function () {
				const response = await request(app)
					.put(`/api/pets/${petToUpdateId}`)
					.set('Cookie', cookie)
					.send(updatedPetData)
					.expect(200); // Expecting the update to be successful

				expect(response.body.message).to.equal('Pet updated successfully');
				expect(response.body.data).to.include(updatedPetData);
			});
		});

		describe('GET /api/pets/owner/:ownerId', function () {
			let ownerIdWithPets, ownerIdWithoutPets;

			before(async () => {
				ownerIdWithPets = generateObjectId();
				ownerIdWithoutPets = generateObjectId();

				await Pet.create([
					{
						petName: 'Rex',
						ownerId: ownerIdWithPets,
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
					},
					{
						petName: 'Meow',
						ownerId: ownerIdWithPets,
						age: 4,
						shortDescription: 'Curious and playful cat',
						longDescription:
							'Meow meow meow, always curious and loves to explore.',
						gender: 'Male',
						status: 'Available',
						type: 'Cat',
						characteristics: {
							common: {
								size: 'Medium',
								temperament: 'Playful',
								vaccination_status: 'Up-to-date',
							},
							specific: {
								breed: 'Siamese',
								intelligence_level: 'High',
								activity_level: 'Moderate',
							},
						},
					},
				]);
			});

			after(async () => {
				// Cleanup the test pets created for ownerIdWithPets.
				await Pet.deleteMany({ ownerId: ownerIdWithPets });
			});

			it('should return all pets for a given ownerId with pets', async function () {
				const response = await request(app)
					.get(`/api/pets/owner/${ownerIdWithPets}`)
					.set('Cookie', cookie) // Assuming authentication is required
					.expect(200); // Expecting the request to be successful

				// expect(response.body.message).to.equal('Pets fetched successfully');
				expect(response.body).to.be.an('array');
				expect(response.body.length).to.be.greaterThan(0);
				response.body.forEach((pet) => {
					expect(pet.ownerId).to.equal(ownerIdWithPets.toString());
				});
			});

			it('should return a 404 status if no pets are found for a given ownerId', async function () {
				const response = await request(app)
					.get(`/api/pets/owner/${ownerIdWithoutPets}`)
					.set('Cookie', cookie) // Assuming authentication is required
					.expect(404); // Expecting the request to result in a "not found" status

				expect(response.body.message).to.equal('No pets found for this owner');
			});

			/* 
			!!! DEPRECIATED - This code will turn every input into an ObjectId now so test is
			 */
			// it('should return a 400 status if the ownerId is not a valid ObjectId', async function () {
			// 	const invalidOwnerId = '123'; // Simulating an invalid ObjectId
			// 	const response = await request(app)
			// 		.get(`/api/pets/owner/${invalidOwnerId}`)
			// 		.set('Cookie', cookie) // Assuming authentication is required
			// 		.expect(500); // Expecting the request to result in a "bad request" status

			// 	expect(response.body.message).to.include(
			// 		'Failed to fetch pets for this owner'
			// 	);
			// });
		});
	});

	context('as non-staff of the rescue', function () {
		beforeEach(function () {
			jwt.verify.callsFake((token, secret, callback) => {
				callback(null, { userId: nonStaffUserId, isAdmin: false });
			});

			sinon.stub(Rescue, 'find').resolves([
				{
					staff: [
						{
							userId: staffUserId,
							permissions: ['add_pet', 'edit_pet', 'delete_pet'],
						},
					],
				},
			]);

			const token = 'dummyToken'; // Simulate an auth token.
			cookie = `token=${token};`; // Simulate a browser cookie containing the auth token.
		});

		afterEach(function () {
			if (Rescue.find.restore) {
				Rescue.find.restore();
			}
		});

		describe('POST /api/pets/ for non-staff', function () {
			it('should reject pet creation for non-staff members', async function () {
				const petData = {
					petName: 'Buddy',
					ownerId: generateObjectId(),
					shortDescription: 'A lovely cat',
					age: 4,
					longDescription:
						'Buddy is a quiet and lovely indoor cat looking for a new home.',
					gender: 'Male',
					status: 'Available',
					type: 'Cat',
					characteristics: {
						common: {
							size: 'Small',
							temperament: 'Calm',
							vaccination_status: 'Up-to-date',
						},
						specific: {
							breed: 'Siamese',
							intelligence_level: 'High',
							activity_level: 'Low',
						},
					},
				};

				const response = await request(app)
					.post('/api/pets')
					.set('Cookie', cookie) // Use the simulated auth cookie for authentication
					.send(petData)
					.expect(403); // Expecting a 403 Forbidden status due to lack of permissions

				expect(response.body.message).to.equal(
					'Insufficient permissions to add pet'
				);
			});
		});

		describe('DELETE /api/pets/:id for non-staff', function () {
			let petIdToDelete;

			beforeEach(async function () {
				// Assuming jwt.verify is already stubbed from the previous context.
				// Setup a mock pet ID to delete.
				petIdToDelete = generateObjectId();

				// Stub the Pet model's findByIdAndDelete method.
				sinon.stub(Pet, 'findByIdAndDelete').callsFake((id) => {
					if (id.toString() === petIdToDelete.toString()) {
						return Promise.resolve({ _id: id });
					}
					return Promise.resolve(null);
				});
			});

			afterEach(function () {
				// Restore the stubbed method after each test.
				Pet.findByIdAndDelete.restore();
			});

			it('should reject pet deletion for non-staff members', async function () {
				const response = await request(app)
					.delete(`/api/pets/${petIdToDelete}`)
					.set('Cookie', cookie) // Use the simulated auth cookie for authentication
					.expect(403); // Expecting the deletion to be successful

				expect(response.body.message).to.equal(
					'Insufficient permissions to delete pet'
				);
			});
		});

		describe('PUT /api/pets/:id for non-staff', function () {
			let petToUpdateId, updatedPetData;

			beforeEach(async function () {
				petToUpdateId = generateObjectId();

				updatedPetData = {
					petName: 'Attempted Update Name',
					age: 6,
				};

				sinon
					.stub(Pet, 'findByIdAndUpdate')
					.callsFake((id, update, options) => {
						if (id.toString() === petToUpdateId.toString()) {
							return Promise.resolve({ _id: id, ...updatedPetData });
						}
						return Promise.resolve(null);
					});
			});

			afterEach(function () {
				Pet.findByIdAndUpdate.restore();
			});

			it('should reject pet update for non-staff members', async function () {
				const response = await request(app)
					.put(`/api/pets/${petToUpdateId}`)
					.set('Cookie', cookie)
					.send(updatedPetData)
					.expect(403); // Expecting a 403 Forbidden status

				expect(response.body.message).to.equal(
					'Insufficient permissions to edit pet'
				);
			});
		});
	});

	context('as any logged-in user', function () {
		beforeEach(function () {
			jwt.verify.callsFake((token, secret, callback) => {
				callback(null, { userId: 'someUserId', isAdmin: false });
			});

			const token = 'dummyToken'; // Simulate an auth token.
			cookie = `token=${token};`; // Simulate a browser cookie containing the auth token.
		});

		afterEach(function () {
			if (Rescue.find.restore) {
				Rescue.find.restore();
			}
		});

		describe('GET /api/pets', function () {
			it('should fetch all pet records successfully', async function () {
				sinon.stub(Pet, 'find').resolves([{ name: 'Buddy' }, { name: 'Max' }]); // Example stub response

				const response = await request(app)
					.get('/api/pets')
					.set('Cookie', cookie)
					.expect(200); // Expecting the fetch to be successful

				expect(response.body.message).to.equal('Pets fetched successfully');
				expect(response.body.data).to.be.an('array');
				Pet.find.restore(); // Clean up stub
			});
		});

		describe('GET /api/pets/:id', function () {
			let petToFetchId;

			beforeEach(function () {
				petToFetchId = generateObjectId();
			});

			it('should fetch a specific pet record by ID successfully', async function () {
				sinon.stub(Pet, 'findById').callsFake((id) => {
					if (id.toString() === petToFetchId.toString()) {
						return Promise.resolve({ _id: id, name: 'Buddy' });
					}
					return Promise.resolve(null);
				});

				const response = await request(app)
					.get(`/api/pets/${petToFetchId}`)
					.set('Cookie', cookie)
					.expect(200); // Expecting the fetch to be successful

				expect(response.body.message).to.equal('Pet fetched successfully');
				expect(response.body.data).to.include({ _id: petToFetchId.toString() });
				Pet.findById.restore(); // Clean up stub
			});

			it('should return a 404 error if the pet is not found', async function () {
				sinon.stub(Pet, 'findById').resolves(null);

				const response = await request(app)
					.get(`/api/pets/${petToFetchId}`)
					.set('Cookie', cookie)
					.expect(404); // Expecting a 404 Not Found status

				expect(response.body.message).to.equal('Pet not found');
				Pet.findById.restore(); // Clean up stub
			});
		});
	});

	// context.only('as a user who is not logged in', function () {
	// 	describe('GET /api/pets', function () {
	// 		it('should not allow fetching all pet records without authentication', async function () {
	// 			const response = await request(app)
	// 				.get('/api/pets')
	// 				.set('Cookie', null)
	// 				.expect(401); // Expecting the request to be unauthorized

	// 			expect(response.body.message).to.equal('No token provided');
	// 		});
	// 	});

	// 	describe('GET /api/pets/:id', function () {
	// 		let petToFetchId;

	// 		beforeEach(function () {
	// 			petToFetchId = generateObjectId();
	// 		});

	// 		it('should not allow fetching a specific pet record by ID without authentication', async function () {
	// 			const response = await request(app)
	// 				.get(`/api/pets/${petToFetchId}`)
	// 				.set('Cookie', null)
	// 				.expect(401); // Expecting the request to be unauthorized

	// 			expect(response.body.message).to.equal('No token provided');
	// 		});
	// 	});
	// });

	// context('as an admin user', function () {
	// 	beforeEach(function () {
	// 		jwt.verify.callsFake((token, secret, callback) => {
	// 			callback(null, { userId: adminUserId, isAdmin: true });
	// 		});
	// 	});

	// 	it('should allow pet creation for admin users', async function () {
	// 		// Simulate a successful pet creation request as an admin user...
	// 	});
	// });
});
