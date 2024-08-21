import dotenv from 'dotenv'
import { Sequelize } from 'sequelize'
import { AuditLogger } from './services/auditLogService'

dotenv.config()

const env = process.env.NODE_ENV || 'development'
let database: string

switch (env) {
  case 'development':
    database = process.env.DEV_DB_NAME!
    AuditLogger.logAction(
      'DatabaseService',
      'Selected development database',
      'INFO',
    )
    break
  case 'test':
    database = process.env.TEST_DB_NAME!
    AuditLogger.logAction('DatabaseService', 'Selected test database', 'INFO')
    break
  case 'production':
    database = process.env.PROD_DB_NAME!
    AuditLogger.logAction(
      'DatabaseService',
      'Selected production database',
      'INFO',
    )
    break
  default:
    const errorMessage = 'NODE_ENV is not set to a valid environment'
    AuditLogger.logAction('DatabaseService', errorMessage, 'ERROR')
    throw new Error(errorMessage)
}

const sequelize = new Sequelize(
  database,
  process.env.POSTGRES_USER!,
  process.env.POSTGRES_PASSWORD!,
  {
    host: process.env.POSTGRES_HOST!,
    port: Number(process.env.POSTGRES_PORT!),
    dialect: 'postgres',
  },
)

try {
  // Any operations like testing the connection should be done here
  AuditLogger.logAction(
    'DatabaseService',
    `Initialized Sequelize with database ${database}`,
    'INFO',
  )
} catch (error) {
  if (error instanceof Error) {
    AuditLogger.logAction(
      'DatabaseService',
      `Database initialization failed: ${error.message}`,
      'ERROR',
    )
  } else {
    AuditLogger.logAction(
      'DatabaseService',
      'Unknown error during database initialization',
      'ERROR',
    )
  }
  throw error
}

export default sequelize
