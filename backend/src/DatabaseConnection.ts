import dotenv from 'dotenv'
import { Pool, PoolClient } from 'pg'

dotenv.config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production'
      ? {
          rejectUnauthorized: true,
        }
      : false,
})

// Set timezone to UTC for each new client
pool.on('connect', async (client: PoolClient) => {
  try {
    await client.query("SET TIME ZONE 'UTC';")
    console.log('Timezone set to UTC for this client')
  } catch (error) {
    console.error('Failed to set timezone to UTC', error)
  }
})

const ConnectToDatabase = async (): Promise<void> => {
  try {
    await pool.connect() // Check if the connection is successful
    console.log('PostgreSQL connected')
  } catch (error) {
    console.error('PostgreSQL connection error:', (error as Error).message)
    process.exit(1) // Exit process if connection fails
  }
}

export { ConnectToDatabase, pool }
