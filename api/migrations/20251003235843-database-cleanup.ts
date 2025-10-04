/**
 * Migration: Database Cleanup
 * Purpose: Clean slate for development resets - drops all tables, triggers, functions, and extensions
 *
 * WARNING: This is destructive and should only be used in development environments
 */

import { QueryInterface } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`
    -- Drop all triggers (if exist)
    DROP TRIGGER IF EXISTS update_user_updated_at ON "user" CASCADE;
    DROP TRIGGER IF EXISTS update_external_identity_updated_at ON external_identity CASCADE;
    DROP TRIGGER IF EXISTS update_organization_updated_at ON organization CASCADE;
    DROP TRIGGER IF EXISTS update_environment_updated_at ON environment CASCADE;
    DROP TRIGGER IF EXISTS update_org_member_updated_at ON organization_member CASCADE;
    DROP TRIGGER IF EXISTS update_group_updated_at ON "group" CASCADE;
    DROP TRIGGER IF EXISTS update_role_updated_at ON role CASCADE;
    DROP TRIGGER IF EXISTS update_env_role_updated_at ON environment_role_assignment CASCADE;
    DROP TRIGGER IF EXISTS update_webhook_updated_at ON webhook CASCADE;

    -- Drop all tables in reverse dependency order
    DROP TABLE IF EXISTS webhook_delivery CASCADE;
    DROP TABLE IF EXISTS webhook CASCADE;
    DROP TABLE IF EXISTS event_type CASCADE;
    DROP TABLE IF EXISTS event CASCADE;
    DROP TABLE IF EXISTS user_impersonation_session CASCADE;
    DROP TABLE IF EXISTS environment_role_assignment CASCADE;
    DROP TABLE IF EXISTS role_permission CASCADE;
    DROP TABLE IF EXISTS permission CASCADE;
    DROP TABLE IF EXISTS role CASCADE;
    DROP TABLE IF EXISTS group_member CASCADE;
    DROP TABLE IF EXISTS "group" CASCADE;
    DROP TABLE IF EXISTS organization_member CASCADE;
    DROP TABLE IF EXISTS magic_link_token CASCADE;
    DROP TABLE IF EXISTS user_session CASCADE;
    DROP TABLE IF EXISTS device CASCADE;
    DROP TABLE IF EXISTS environment CASCADE;
    DROP TABLE IF EXISTS organization CASCADE;
    DROP TABLE IF EXISTS external_identity CASCADE;
    DROP TABLE IF EXISTS "user" CASCADE;

    -- Drop extensions
    DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;

    -- Drop functions
    DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
  `);
}

export async function down(_queryInterface: QueryInterface): Promise<void> {
  // No-op: Cannot reverse a cleanup operation
  // The next migration (create-core-schema) will rebuild everything
}
