/**
 * Environment Constants
 * Node environment values
 */

export const NODE_ENV = {
  PRODUCTION: 'production',
  DEVELOPMENT: 'development',
  TEST: 'test',
} as const;

export type NodeEnvironment = (typeof NODE_ENV)[keyof typeof NODE_ENV];
