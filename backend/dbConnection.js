// dbConnection.js
import pg from 'pg'; // Import the entire pg module
const { Pool } = pg; // Destructure Pool from the imported module
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
	ssl:
		process.env.NODE_ENV === 'production'
			? {
					rejectUnauthorized: true, // This should be true in production for security reasons
			  }
			: false,
});

// Set timezone to UTC for each new client
pool.on('connect', async (client) => {
	try {
		await client.query("SET TIME ZONE 'UTC';");
		console.log('Timezone set to UTC for this client');
	} catch (error) {
		console.error('Failed to set timezone to UTC', error);
	}
});

const connectDB = async () => {
	try {
		await pool.connect(); // This checks if the connection is successful
		console.log('PostgreSQL connected');
	} catch (error) {
		console.error('PostgreSQL connection error:', error.message);
		process.exit(1);
	}
};

export { pool, connectDB }; // Export the pool to use elsewhere and the connect function
