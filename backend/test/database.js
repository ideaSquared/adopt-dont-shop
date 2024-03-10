// mongoConnection.test.js
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

export const connectToDatabase = async () => {
	mongoServer = await MongoMemoryServer.create();
	const uri = mongoServer.getUri();

	await mongoose.connect(uri);
};

export const disconnectFromDatabase = async () => {
	await mongoose.disconnect();
	await mongoServer.stop();
};
