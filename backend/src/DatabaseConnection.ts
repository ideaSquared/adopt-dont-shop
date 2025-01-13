import dotenv from 'dotenv'
import { Pool, PoolClient } from 'pg'
import { AuditLogger } from './services/auditLogService'

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
      const errorMessage = 'NODE_ENV is not set to a valid environment'
      AuditLogger.logAction('DatabaseService', errorMessage, 'ERROR')
      throw new Error(errorMessage)
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
    AuditLogger.logAction(
      'DatabaseService',
      'Timezone set to UTC for a database client',
      'INFO',
    )
  } catch (error) {
    const errorMessage = 'Failed to set timezone to UTC'
    console.error(errorMessage, error)
    AuditLogger.logAction(
      'DatabaseService',
      `${errorMessage}: ${(error as Error).message}`,
      'ERROR',
    )
  }
})

const connectToDatabase = async (): Promise<void> => {
  try {
    await pool.connect() // Check if the connection is successful
    console.log('PostgreSQL connected')
    AuditLogger.logAction(
      'DatabaseService',
      'PostgreSQL connected successfully',
      'INFO',
    )
  } catch (error) {
    const errorMessage = 'PostgreSQL connection error'
    console.error(`${errorMessage}:`, (error as Error).message)
    AuditLogger.logAction(
      'DatabaseService',
      `${errorMessage}: ${(error as Error).message}`,
      'ERROR',
    )
    process.exit(1) // Exit process if connection fails
  }
}

export { connectToDatabase, pool }
