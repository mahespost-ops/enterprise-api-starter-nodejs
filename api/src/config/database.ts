/**
 * Database Configuration
 * Sequelize instance initialization with connection pooling and logging
 */

import { Sequelize } from 'sequelize';

// Parse DATABASE_URL from environment
const databaseUrl = process.env.DATABASE_URL || 'postgresql://mike@localhost:5432/enterprise';

// Initialize Sequelize with configuration optimized for performance
const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  // eslint-disable-next-line no-console
  logging: process.env.NODE_ENV === 'development' ? console.log : false, // Simple logging for migrations
  pool: {
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    min: parseInt(process.env.DB_POOL_MIN || '5', 10),
    acquire: 30000, // Maximum time (ms) to get connection before throwing error
    idle: 10000, // Maximum time (ms) a connection can be idle before being released
  },
  timezone: '+00:00', // Store everything in UTC
  dialectOptions: {
    statement_timeout: 10000, // 10s query timeout
    idle_in_transaction_session_timeout: 30000, // 30s idle transaction timeout
  },
  define: {
    // Global model options
    timestamps: true,
    underscored: true, // Use snake_case for automatically added attributes
    freezeTableName: true, // Prevent Sequelize from pluralizing table names
  },
});

// Test connection (only log if logger is available)
if (process.env.NODE_ENV !== 'test') {
  sequelize
    .authenticate()
    .then(() => {
      // eslint-disable-next-line no-console
      console.log('Database connection established successfully');
    })
    .catch((err) => {
      console.error('Unable to connect to the database:', err);
    });
}

export default sequelize;
