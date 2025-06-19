import * as dotenv from 'dotenv'
import { Dialect } from 'sequelize'

dotenv.config()

interface DBConfig {
  username: string
  password: string | null
  database: string
  host: string
  dialect: Dialect
  port?: number
}

interface Config {
  development: DBConfig
  test: DBConfig
  production: DBConfig
}

const config: Config = {
  development: {
    username: process.env.POSTGRES_USER || 'root',
    password: process.env.POSTGRES_PASSWORD || null,
    database: process.env.DEV_DB_NAME || 'adoptdontshop_development',
    host: process.env.POSTGRES_HOST || '127.0.0.1',
    dialect: 'postgres',
    port: Number(process.env.POSTGRES_PORT) || 5432,
  },
  test: {
    username: process.env.POSTGRES_USER || 'root',
    password: process.env.POSTGRES_PASSWORD || null,
    database: process.env.TEST_DB_NAME || 'adoptdontshop_test',
    host: process.env.POSTGRES_HOST || '127.0.0.1',
    dialect: 'postgres',
    port: Number(process.env.POSTGRES_PORT) || 5432,
  },
  production: {
    username: process.env.POSTGRES_USER || 'root',
    password: process.env.POSTGRES_PASSWORD || null,
    database: process.env.PROD_DB_NAME || 'adoptdontshop_production',
    host: process.env.POSTGRES_HOST || '127.0.0.1',
    dialect: 'postgres',
    port: Number(process.env.POSTGRES_PORT) || 5432,
  },
}

export default config
