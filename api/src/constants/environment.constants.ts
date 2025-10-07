/**
 * Environment Constants
 * Node environment and organizational environment values
 */

export const NODE_ENV = {
  PRODUCTION: 'production',
  DEVELOPMENT: 'development',
  TEST: 'test',
} as const;

export type NodeEnvironment = (typeof NODE_ENV)[keyof typeof NODE_ENV];

/**
 * Environment status values
 * - active: Environment is active and usable
 * - inactive: Environment is disabled/archived
 */
export const ENVIRONMENT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

export type EnvironmentStatus = (typeof ENVIRONMENT_STATUS)[keyof typeof ENVIRONMENT_STATUS];
