import dotenv from 'dotenv'
import { Pool, PoolClient } from 'pg'

dotenv.config()

const databaseUrl = (() => {
  switch (process.env.NODE_ENV) {
    case 'development':
      return process.env.DEV_DATABASE_URL
    case 'test':
      return process.env.TEST_DATABASE_URL
    case 'production':
      return process.env.PROD_DATABASE_URL
    default:
      throw new Error('NODE_ENV is not set to a valid environment')
  }
})()

const pool = new Pool({
  connectionString: databaseUrl,
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
