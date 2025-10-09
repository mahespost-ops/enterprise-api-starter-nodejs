/**
 * Migration: Seed System Organization and Environment
 * Purpose: Creates a System organization and environment for unauthenticated/system events
 *
 * UUID Pattern:
 * - Organizations: 00000000-0000-0000-0000-0000000000YY (last 2 digits = org ID)
 * - Environments: 00000000-0000-0000-0000-000000000XYY (last 4 digits = env + org ID)
 *
 * System IDs:
 * - System Organization: 00000000-0000-0000-0000-000000000001 (org 01)
 * - System Environment:  00000000-0000-0000-0000-000000000100 (env 00, org 01)
 */

import { QueryInterface } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`
    -- ========================================
    -- Seed System Organization
    -- ========================================
    INSERT INTO organization (
      id,
      name,
      slug,
      description,
      primary_contact_name,
      primary_contact_email,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000001',
      'System',
      'system',
      'System organization for unauthenticated and system events',
      'System',
      'system@localhost',
      TRUE,
      NOW() AT TIME ZONE 'UTC',
      NOW() AT TIME ZONE 'UTC'
    )
    ON CONFLICT (id) DO NOTHING;

    -- ========================================
    -- Seed System Environment
    -- ========================================
    INSERT INTO environment (
      id,
      organization_id,
      name,
      type,
      description,
      is_default,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000100',
      '00000000-0000-0000-0000-000000000001',
      'System',
      'live',
      'System environment for unauthenticated and system events',
      TRUE,
      TRUE,
      NOW() AT TIME ZONE 'UTC',
      NOW() AT TIME ZONE 'UTC'
    )
    ON CONFLICT (id) DO NOTHING;
  `);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`
    -- Remove System environment first (foreign key dependency)
    DELETE FROM environment WHERE id = '00000000-0000-0000-0000-000000000100';

    -- Remove System organization
    DELETE FROM organization WHERE id = '00000000-0000-0000-0000-000000000001';
  `);
}
