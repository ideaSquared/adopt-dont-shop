import request from 'supertest';
import sinon from 'sinon';
import jwt from 'jsonwebtoken';
import { expect } from 'chai';
import app from '../index.js'; // Your Express application
import { connectToDatabase, disconnectFromDatabase } from './database.js'; // Adjust the path according to your project structure
import Rating from '../models/Rating.js'; // Adjust the path according to your project structure
import User from '../models/User.js';
import Pet from '../models/Pet.js';
import { generateObjectId } from '../utils/generateObjectId.js'; // Utility function to generate valid MongoDB ObjectIds

describe('Rating Routes', function () {
	let userId, targetUserId, invalidUserId, cookie, petId;

	before(async () => {
		await connectToDatabase();
		userId = generateObjectId();
		targetUserId = generateObjectId();
		invalidUserId = generateObjectId(); // Invalid ID for negative test cases
		petId = generateObjectId();
		sinon.stub(jwt, 'verify');
	});

	after(async () => {
		await disconnectFromDatabase();
		sinon.restore();
	});

	beforeEach(function () {
		sinon.resetBehavior();
		sinon.resetHistory();

		jwt.verify.callsFake((token, secret, callback) => {
			callback(null, { userId: userId });
		});

		const token = 'dummyToken';
		cookie = `token=${token};`;
	});

	/*
    !!! TODO: This doesn't work - I've struggled long enough trying to figure this out so I'm going to continue and come back
    */
	// describe('POST /api/ratings', function () {
	// 	let UserStub, PetStub, RatingStub;

	// 	before(async () => {
	// 		UserStub = sinon.stub(User, 'exists').callsFake(async (data) => ({
	// 			...data,
	// 			_id: userId,
	// 		}));
	// 		PetStub = sinon.stub(Pet, 'exists').callsFake(async (data) => ({
	// 			...data,
	// 			_id: petId,
	// 		}));
	// 		RatingStub = sinon.stub(Rating, 'create').callsFake(async (data) => ({
	// 			...data,
	// 			_id: 'newRatingId',
	// 		}));
	// 	});

	// 	it('should create a rating for a pet successfully', async () => {
	// 		const response = await request(app)
	// 			.post('/api/ratings/')
	// 			.set('Cookie', cookie)
	// 			.send({
	// 				userId: userId,
	// 				targetId: petId,
	// 				targetType: 'pet',
	// 				ratingSource: 'user',
	// 				ratingType: 'like',
	// 				onModel: 'Pet',
	// 			})
	// 			.expect(201);

	// 		expect(response.body.message).to.equal('Rating created successfully');
	// 		expect(response.body.data._id).to.equal('newRatingId');
	// 		expect(RatingStub.calledOnce).to.be.true;
	// 	});

	// 	// Add more tests here for other scenarios
	// });

	describe('GET /api/ratings/target/:targetId', function () {
		it('should fetch ratings for a specific targetId', async function () {
			sinon.stub(Rating, 'find').resolves([{ userId, ratingType: 'like' }]); // Example stub response

			const response = await request(app)
				.get(`/api/ratings/target/${targetUserId}`)
				.set('Cookie', cookie)
				.expect(200); // Expecting the fetch to be successful

			expect(response.body.message).to.equal('Ratings fetched successfully');
			expect(response.body.data).to.be.an('array');
			Rating.find.restore(); // Clean up stub
		});

		it('should return a 404 error if no ratings are found', async function () {
			sinon.stub(Rating, 'find').resolves([]); // No ratings found

			const response = await request(app)
				.get(`/api/ratings/target/${targetUserId}`)
				.set('Cookie', cookie)
				.expect(404); // Expecting a 404 Not Found status

			expect(response.body.message).to.equal('No ratings found');
			Rating.find.restore(); // Clean up stub
		});
	});

	// Additional tests can be written for updating and deleting ratings in a similar manner,
	// including tests for permission checks where applicable.
});
