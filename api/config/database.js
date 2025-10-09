/**
 * Sequelize CLI Configuration
 * This file is used by sequelize-cli for migrations
 * Note: This is CommonJS format required by sequelize-cli
 */

require('dotenv').config();

module.exports = {
  development: {
    url: process.env.DATABASE_URL || 'postgresql://mike@localhost:5432/enterprise',
    dialect: 'postgres',
    logging: console.log,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      min: parseInt(process.env.DB_POOL_MIN || '5', 10),
      acquire: 30000,
      idle: 10000,
    },
    timezone: '+00:00',
    dialectOptions: {
      statement_timeout: 10000,
      idle_in_transaction_session_timeout: 30000,
    },
  },
  test: {
    url: process.env.DATABASE_URL || 'postgresql://mike@localhost:5432/enterprise_test',
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 1,
      acquire: 30000,
      idle: 10000,
    },
    timezone: '+00:00',
  },
  production: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      min: parseInt(process.env.DB_POOL_MIN || '5', 10),
      acquire: 30000,
      idle: 10000,
    },
    timezone: '+00:00',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // For managed databases like Cloud SQL
      },
      statement_timeout: 10000,
      idle_in_transaction_session_timeout: 30000,
    },
  },
};
