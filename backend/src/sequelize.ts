import dotenv from 'dotenv'
import { Sequelize } from 'sequelize'

dotenv.config()

const env = process.env.NODE_ENV || 'development'
let database: string

switch (env) {
  case 'development':
    database = process.env.DEV_DB_NAME!
    break
  case 'test':
    database = process.env.TEST_DB_NAME!
    break
  case 'production':
    database = process.env.PROD_DB_NAME!
    break
  default:
    throw new Error('NODE_ENV is not set to a valid environment')
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

export default sequelize
