// sequelize-cli database configuration
// Reads connection details from environment variables (same as app runtime)
module.exports = {
  production: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.PROD_DB_NAME,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: 'postgres',
    logging: false,
  },
  development: {
    username: process.env.DB_USERNAME || 'adopt_user',
    password: process.env.DB_PASSWORD,
    database: process.env.DEV_DB_NAME || 'adopt_dont_shop_dev',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: 'postgres',
    logging: false,
  },
  test: {
    username: process.env.DB_USERNAME || 'adopt_user',
    password: process.env.DB_PASSWORD,
    database: process.env.TEST_DB_NAME || 'adopt_dont_shop_test',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: 'postgres',
    logging: false,
  },
};
