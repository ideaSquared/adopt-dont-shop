// import mongoose from 'mongoose';
// import { MongoMemoryServer } from 'mongodb-memory-server';

// let mongoServer;

// /**
//  * Establishes a connection to an in-memory MongoDB instance for testing.
//  * This function initializes a new MongoMemoryServer instance and connects mongoose to it.
//  * It's useful for integration tests where a MongoDB database is required, without affecting a real database.
//  */
// export const connectToDatabase = async () => {
// 	// Create a new instance of MongoMemoryServer for an in-memory database.
// 	mongoServer = await MongoMemoryServer.create();
// 	// Retrieve the URI of the in-memory database.
// 	const uri = mongoServer.getUri();

// 	// Connect mongoose to the in-memory database.
// 	await mongoose.connect(uri);
// };

// /**
//  * Disconnects mongoose from the in-memory MongoDB instance and stops the MongoMemoryServer.
//  * This function ensures that after tests are run, the connection to the MongoDB instance is cleanly closed,
//  * and the in-memory database is stopped, releasing resources and preventing memory leaks.
//  */
// export const disconnectFromDatabase = async () => {
// 	// Disconnect mongoose from the database.
// 	await mongoose.disconnect();
// 	// Stop the in-memory MongoDB server.
// 	await mongoServer.stop();
// };
