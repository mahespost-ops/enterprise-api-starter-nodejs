/**
 * Migration: Create Core Schema
 * Purpose: Creates all 19 core database tables with optimizations for 100-200M+ records
 *
 * Tables created (in dependency order):
 * 1. user - Core identity (OIDC compliant)
 * 2. external_identity - OAuth/SSO providers
 * 3. magic_link_token - Passwordless authentication
 * 4. device - Device fingerprinting & trust
 * 5. user_session - Active sessions with geolocation
 * 6. organization - Multi-tenant organizations with contact/address
 * 7. environment - Org environments (Live, Sandbox)
 * 8. organization_member - User-org membership
 * 9. group - Hierarchical groups for RBAC
 * 10. group_member - User-group membership
 * 11. role - RBAC roles
 * 12. permission - Granular permissions
 * 13. role_permission - Role-permission associations
 * 14. environment_role_assignment - Polymorphic role assignments
 * 15. user_impersonation_session - Hierarchical impersonation
 * 16. event_type - Maps endpoints to event verbs
 * 17. event - W3C Activity Streams (heavily denormalized)
 * 18. webhook - CloudEvents 1.0.2 webhooks
 * 19. webhook_delivery - Webhook delivery tracking
 */

import { QueryInterface } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(`
    -- ========================================
    -- Extensions & Functions
    -- ========================================

    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW() AT TIME ZONE 'UTC';
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- ========================================
    -- Table 1: user (Core identity - OIDC compliant)
    -- ========================================

    CREATE TABLE "user" (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v1(),
      email VARCHAR(255) UNIQUE NOT NULL,
      email_verified BOOLEAN DEFAULT FALSE NOT NULL,
      phone_number VARCHAR(20) UNIQUE,
      phone_number_verified BOOLEAN DEFAULT FALSE NOT NULL,
      given_name VARCHAR(50) NOT NULL,
      family_name VARCHAR(50) NOT NULL,
      middle_name VARCHAR(50),
      nickname VARCHAR(50),
      preferred_username VARCHAR(50),
      profile VARCHAR(500),
      picture VARCHAR(500),
      website VARCHAR(500),
      gender VARCHAR(20),
      birthdate DATE,
      zoneinfo VARCHAR(50),
      locale VARCHAR(10),
      preferred_auth_method VARCHAR(10) DEFAULT 'email' NOT NULL CHECK (preferred_auth_method IN ('email', 'sms')),
      is_active BOOLEAN DEFAULT TRUE NOT NULL,
      last_login_at TIMESTAMP WITH TIME ZONE,
      last_org_id UUID,
      last_env_id UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE
    );

    CREATE INDEX idx_user_email ON "user"(email) WHERE deleted_at IS NULL;
    CREATE INDEX idx_user_phone ON "user"(phone_number) WHERE phone_number IS NOT NULL AND deleted_at IS NULL;
    CREATE INDEX idx_user_created_at ON "user"(created_at);
    CREATE INDEX idx_user_last_login ON "user"(last_login_at) WHERE last_login_at IS NOT NULL;
    CREATE INDEX idx_user_is_active ON "user"(is_active) WHERE deleted_at IS NULL;

    CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "user" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    -- ========================================
    -- Table 2: external_identity (OAuth/SSO)
    -- ========================================

    CREATE TABLE external_identity (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v1(),
      user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      provider VARCHAR(50) NOT NULL CHECK (provider IN ('google', 'microsoft', 'okta', 'auth0', 'github', 'saml')),
      provider_user_id VARCHAR(255) NOT NULL,
      provider_email VARCHAR(255),
      access_token_encrypted TEXT,
      refresh_token_encrypted TEXT,
      id_token TEXT,
      token_expires_at TIMESTAMP WITH TIME ZONE,
      profile_data JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
      UNIQUE(provider, provider_user_id)
    );

    CREATE INDEX idx_external_identity_user_id ON external_identity(user_id);
    CREATE INDEX idx_external_identity_provider ON external_identity(provider, provider_user_id);

    CREATE TRIGGER update_external_identity_updated_at BEFORE UPDATE ON external_identity FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    -- ========================================
    -- Table 3: magic_link_token (Passwordless auth)
    -- ========================================

    CREATE TABLE magic_link_token (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v1(),
      user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) UNIQUE NOT NULL,
      code_hash VARCHAR(255) NOT NULL,
      fingerprint TEXT,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      used_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL
    );

    CREATE INDEX idx_magic_token_user_id ON magic_link_token(user_id);
    CREATE INDEX idx_magic_token_hash ON magic_link_token(token_hash) WHERE used_at IS NULL;
    CREATE INDEX idx_magic_token_expires ON magic_link_token(expires_at) WHERE used_at IS NULL;

    -- ========================================
    -- Table 4: device (Device fingerprinting & trust)
    -- ========================================

    CREATE TABLE device (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v1(),
      user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      fingerprint_hash VARCHAR(255) NOT NULL,
      device_name VARCHAR(100),
      device_type VARCHAR(20) CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'unknown')),
      os VARCHAR(50),
      browser VARCHAR(50),
      user_agent TEXT,
      timezone VARCHAR(50),
      screen_resolution VARCHAR(20),
      trust_status VARCHAR(20) DEFAULT 'pending' NOT NULL CHECK (trust_status IN ('trusted', 'pending', 'revoked')),
      first_seen_ip INET NOT NULL,
      last_seen_ip INET,
      last_country CHAR(2),
      last_region VARCHAR(100),
      last_city VARCHAR(100),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
      last_used_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
      revoked_at TIMESTAMP WITH TIME ZONE,
      UNIQUE(user_id, fingerprint_hash)
    );

    CREATE INDEX idx_device_user_id ON device(user_id) WHERE revoked_at IS NULL;
    CREATE INDEX idx_device_fingerprint ON device(fingerprint_hash);
    CREATE INDEX idx_device_trust_status ON device(trust_status) WHERE revoked_at IS NULL;
    CREATE INDEX idx_device_last_used ON device(last_used_at DESC);

    -- ========================================
    -- Table 5: user_session (Active sessions with geolocation)
    -- ========================================

    CREATE TABLE user_session (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v1(),
      user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      device_id UUID NOT NULL REFERENCES device(id) ON DELETE CASCADE,
      refresh_token_hash VARCHAR(255) NOT NULL,
      ip_address INET NOT NULL,
      user_agent TEXT,
      geo_location JSONB,
      request_count INTEGER DEFAULT 0 NOT NULL,
      last_activity_type VARCHAR(50),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
      last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      is_active BOOLEAN DEFAULT TRUE NOT NULL,
      revoked_at TIMESTAMP WITH TIME ZONE,
      revoked_by UUID REFERENCES "user"(id),
      revocation_reason VARCHAR(255)
    );

    CREATE INDEX idx_session_user_id ON user_session(user_id) WHERE is_active = TRUE;
    CREATE INDEX idx_session_device_id ON user_session(device_id);
    CREATE INDEX idx_session_expires_at ON user_session(expires_at) WHERE is_active = TRUE;
    CREATE INDEX idx_session_last_accessed ON user_session(last_accessed_at DESC);

    -- ========================================
    -- Table 6: organization (Multi-tenant with contact/address)
    -- ========================================

    CREATE TABLE organization (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v1(),
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(50) UNIQUE NOT NULL,
      description VARCHAR(500),
      default_env_id UUID,
      logo_url VARCHAR(500),
      website VARCHAR(500),
      primary_contact_name VARCHAR(100),
      primary_contact_email VARCHAR(255),
      primary_contact_phone VARCHAR(20),
      address_line1 VARCHAR(255),
      address_line2 VARCHAR(255),
      city VARCHAR(100),
      state_province VARCHAR(100),
      postal_code VARCHAR(20),
      country CHAR(2),
      metadata JSONB,
      is_active BOOLEAN DEFAULT TRUE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE
    );

    CREATE UNIQUE INDEX idx_org_slug ON organization(slug) WHERE deleted_at IS NULL;
    CREATE INDEX idx_org_is_active ON organization(is_active) WHERE deleted_at IS NULL;
    CREATE INDEX idx_org_created_at ON organization(created_at);
    CREATE INDEX idx_org_country ON organization(country) WHERE country IS NOT NULL AND deleted_at IS NULL;
    CREATE INDEX idx_org_state_province ON organization(country, state_province) WHERE state_province IS NOT NULL AND deleted_at IS NULL;
    CREATE INDEX idx_org_contact_email ON organization(primary_contact_email) WHERE primary_contact_email IS NOT NULL AND deleted_at IS NULL;

    CREATE TRIGGER update_organization_updated_at BEFORE UPDATE ON organization FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    -- ========================================
    -- Table 7: environment (Org environments)
    -- ========================================

    CREATE TABLE environment (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v1(),
      organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
      name VARCHAR(50) NOT NULL,
      type VARCHAR(20) NOT NULL CHECK (type IN ('live', 'sandbox')),
      description VARCHAR(500),
      is_default BOOLEAN DEFAULT FALSE NOT NULL,
      metadata JSONB,
      is_active BOOLEAN DEFAULT TRUE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE,
      UNIQUE(organization_id, name)
    );

    CREATE INDEX idx_env_org_id ON environment(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_env_type ON environment(type);
    CREATE INDEX idx_env_is_default ON environment(organization_id, is_default) WHERE is_default = TRUE AND deleted_at IS NULL;

    CREATE TRIGGER update_environment_updated_at BEFORE UPDATE ON environment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    -- Add FK constraint from organization back to environment
    ALTER TABLE organization ADD CONSTRAINT fk_org_default_env FOREIGN KEY (default_env_id) REFERENCES environment(id) ON DELETE SET NULL;

    -- ========================================
    -- Table 8: organization_member (User-org membership)
    -- ========================================

    CREATE TABLE organization_member (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v1(),
      organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      last_org_id UUID NOT NULL,
      last_env_id UUID,
      role VARCHAR(20) DEFAULT 'member',
      status VARCHAR(20) DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'invited', 'suspended')),
      invited_by UUID REFERENCES "user"(id),
      invitation_token VARCHAR(100) UNIQUE,
      invitation_expires_at TIMESTAMP WITH TIME ZONE,
      joined_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE,
      UNIQUE(organization_id, user_id)
    );

    CREATE INDEX idx_org_member_org_id ON organization_member(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_org_member_user_id ON organization_member(user_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_org_member_status ON organization_member(status) WHERE deleted_at IS NULL;
    CREATE INDEX idx_org_member_invitation ON organization_member(invitation_token) WHERE status = 'invited' AND deleted_at IS NULL;

    CREATE TRIGGER update_org_member_updated_at BEFORE UPDATE ON organization_member FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    -- ========================================
    -- Table 9: group (Hierarchical groups for RBAC)
    -- ========================================

    CREATE TABLE "group" (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v1(),
      organization_id UUID NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      description VARCHAR(500),
      parent_id UUID REFERENCES "group"(id) ON DELETE CASCADE,
      hierarchy_level INTEGER DEFAULT 0 NOT NULL,
      metadata JSONB,
      member_count INTEGER DEFAULT 0 NOT NULL,
      is_active BOOLEAN DEFAULT TRUE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE,
      CONSTRAINT check_no_self_parent CHECK (id != parent_id)
    );

    CREATE INDEX idx_group_org_id ON "group"(organization_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_group_parent_id ON "group"(parent_id) WHERE parent_id IS NOT NULL AND deleted_at IS NULL;
    CREATE INDEX idx_group_hierarchy_level ON "group"(organization_id, hierarchy_level) WHERE deleted_at IS NULL;

    CREATE TRIGGER update_group_updated_at BEFORE UPDATE ON "group" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    -- ========================================
    -- Table 10: group_member (User-group membership)
    -- ========================================

    CREATE TABLE group_member (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v1(),
      group_id UUID NOT NULL REFERENCES "group"(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      added_by UUID REFERENCES "user"(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
      UNIQUE(group_id, user_id)
    );

    CREATE INDEX idx_group_member_group_id ON group_member(group_id);
    CREATE INDEX idx_group_member_user_id ON group_member(user_id);

    -- ========================================
    -- Table 11: role (RBAC roles)
    -- ========================================

    CREATE TABLE role (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v1(),
      name VARCHAR(50) UNIQUE NOT NULL,
      description VARCHAR(500),
      is_system BOOLEAN DEFAULT FALSE NOT NULL,
      permission_count INTEGER DEFAULT 0 NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE
    );

    CREATE INDEX idx_role_name ON role(name) WHERE deleted_at IS NULL;

    CREATE TRIGGER update_role_updated_at BEFORE UPDATE ON role FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    -- ========================================
    -- Table 12: permission (Granular permissions)
    -- ========================================

    CREATE TABLE permission (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v1(),
      key VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      description VARCHAR(500),
      resource VARCHAR(50) NOT NULL,
      action VARCHAR(20) NOT NULL CHECK (action IN ('read', 'manage', 'assign')),
      is_system BOOLEAN DEFAULT TRUE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL
    );

    CREATE INDEX idx_permission_key ON permission(key);
    CREATE INDEX idx_permission_resource ON permission(resource, action);

    -- ========================================
    -- Table 13: role_permission (M:N association)
    -- ========================================

    CREATE TABLE role_permission (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v1(),
      role_id UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
      permission_id UUID NOT NULL REFERENCES permission(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
      UNIQUE(role_id, permission_id)
    );

    CREATE INDEX idx_role_perm_role_id ON role_permission(role_id);
    CREATE INDEX idx_role_perm_permission_id ON role_permission(permission_id);

    -- ========================================
    -- Table 14: environment_role_assignment (Polymorphic)
    -- ========================================

    CREATE TABLE environment_role_assignment (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v1(),
      environment_id UUID NOT NULL REFERENCES environment(id) ON DELETE CASCADE,
      role_id UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
      membership_id UUID REFERENCES organization_member(id) ON DELETE CASCADE,
      group_id UUID REFERENCES "group"(id) ON DELETE CASCADE,
      assigned_by UUID REFERENCES "user"(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
      deleted_at TIMESTAMP WITH TIME ZONE,
      CONSTRAINT check_member_or_group CHECK (
        (membership_id IS NOT NULL AND group_id IS NULL) OR
        (membership_id IS NULL AND group_id IS NOT NULL)
      )
    );

    CREATE INDEX idx_env_role_env_id ON environment_role_assignment(environment_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_env_role_role_id ON environment_role_assignment(role_id) WHERE deleted_at IS NULL;
    CREATE INDEX idx_env_role_membership_id ON environment_role_assignment(membership_id) WHERE membership_id IS NOT NULL AND deleted_at IS NULL;
    CREATE INDEX idx_env_role_group_id ON environment_role_assignment(group_id) WHERE group_id IS NOT NULL AND deleted_at IS NULL;

    CREATE TRIGGER update_env_role_updated_at BEFORE UPDATE ON environment_role_assignment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    -- ========================================
    -- Table 15: user_impersonation_session (Hierarchical impersonation)
    -- ========================================

    CREATE TABLE user_impersonation_session (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v1(),
      original_user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      impersonated_user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
      parent_session_id UUID REFERENCES user_impersonation_session(id) ON DELETE CASCADE,
      environment_id UUID NOT NULL REFERENCES environment(id),
      impersonation_type VARCHAR(20) NOT NULL CHECK (impersonation_type IN ('system', 'organization')),
      permissions JSONB,
      reason TEXT NOT NULL,
      ip_address INET,
      user_agent TEXT,
      started_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      ended_at TIMESTAMP WITH TIME ZONE,
      is_active BOOLEAN DEFAULT TRUE NOT NULL,
      metadata JSONB,
      CONSTRAINT check_no_self_impersonation CHECK (original_user_id != impersonated_user_id)
    );

    CREATE INDEX idx_imp_session_original_user ON user_impersonation_session(original_user_id) WHERE is_active = TRUE;
    CREATE INDEX idx_imp_session_impersonated_user ON user_impersonation_session(impersonated_user_id) WHERE is_active = TRUE;
    CREATE INDEX idx_imp_session_parent ON user_impersonation_session(parent_session_id) WHERE parent_session_id IS NOT NULL;
    CREATE INDEX idx_imp_session_expires ON user_impersonation_session(expires_at) WHERE is_active = TRUE;

    -- ========================================
    -- Table 16: event_type (Maps endpoints to event verbs)
    -- ========================================

    CREATE TABLE event_type (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v1(),
      verb VARCHAR(100) UNIQUE NOT NULL,
      http_method VARCHAR(10) NOT NULL,
      http_path VARCHAR(500) NOT NULL,
      description VARCHAR(500),
      is_webhook_event BOOLEAN DEFAULT FALSE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL
    );

    CREATE INDEX idx_event_type_verb ON event_type(verb);
    CREATE INDEX idx_event_type_webhook ON event_type(is_webhook_event) WHERE is_webhook_event = TRUE;

    -- ========================================
    -- Table 17: event (W3C Activity Streams - heavily denormalized for 100M+ scale)
    -- ========================================

    CREATE TABLE event (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v1(),
      environment_id UUID NOT NULL REFERENCES environment(id),
      verb VARCHAR(100) NOT NULL,
      actor_type VARCHAR(20) NOT NULL CHECK (actor_type IN ('User', 'System')),
      actor JSONB NOT NULL,
      object JSONB,
      target JSONB,
      audit JSONB,
      description TEXT,
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
      organization_id UUID,
      organization_name VARCHAR(100),
      environment_name VARCHAR(50),
      is_webhook_event BOOLEAN DEFAULT FALSE NOT NULL
    );

    -- CRITICAL INDEXES for 100M+ records with cursor pagination
    CREATE INDEX idx_event_timestamp_id ON event(timestamp DESC, id DESC);
    CREATE INDEX idx_event_env_id_timestamp ON event(environment_id, timestamp DESC);
    CREATE INDEX idx_event_org_id_timestamp ON event(organization_id, timestamp DESC);
    CREATE INDEX idx_event_webhook ON event(is_webhook_event, timestamp DESC) WHERE is_webhook_event = TRUE;
    CREATE INDEX idx_event_verb ON event(verb, timestamp DESC);
    CREATE INDEX idx_event_actor_type ON event(actor_type, timestamp DESC);
    CREATE INDEX idx_event_actor_gin ON event USING GIN (actor jsonb_path_ops);
    CREATE INDEX idx_event_audit_gin ON event USING GIN (audit jsonb_path_ops);

    -- ========================================
    -- Table 18: webhook (CloudEvents 1.0.2 webhooks)
    -- ========================================

    CREATE TABLE webhook (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v1(),
      environment_id UUID NOT NULL REFERENCES environment(id) ON DELETE CASCADE,
      url VARCHAR(500) NOT NULL,
      event_types TEXT[] NOT NULL,
      description VARCHAR(500),
      auth_method VARCHAR(20) NOT NULL CHECK (auth_method IN ('none', 'hmac', 'jwt', 'basic', 'digest')),
      auth_config JSONB,
      is_active BOOLEAN DEFAULT TRUE NOT NULL,
      retry_config JSONB NOT NULL,
      headers JSONB,
      timeout INTEGER DEFAULT 10000 NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
      last_delivery_at TIMESTAMP WITH TIME ZONE,
      last_failure_at TIMESTAMP WITH TIME ZONE,
      success_count INTEGER DEFAULT 0 NOT NULL,
      failure_count INTEGER DEFAULT 0 NOT NULL
    );

    CREATE INDEX idx_webhook_env_id ON webhook(environment_id) WHERE is_active = TRUE;
    CREATE INDEX idx_webhook_is_active ON webhook(is_active);
    CREATE INDEX idx_webhook_event_types ON webhook USING GIN (event_types);

    CREATE TRIGGER update_webhook_updated_at BEFORE UPDATE ON webhook FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    -- ========================================
    -- Table 19: webhook_delivery (Webhook delivery tracking)
    -- ========================================

    CREATE TABLE webhook_delivery (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v1(),
      webhook_id UUID NOT NULL REFERENCES webhook(id) ON DELETE CASCADE,
      event_id UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'retrying')),
      attempt INTEGER DEFAULT 1 NOT NULL,
      http_status_code INTEGER,
      request_payload JSONB NOT NULL,
      response_body TEXT,
      response_headers JSONB,
      error_message VARCHAR(1000),
      duration INTEGER,
      next_retry_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'UTC') NOT NULL,
      completed_at TIMESTAMP WITH TIME ZONE
    );

    CREATE INDEX idx_webhook_del_webhook_id ON webhook_delivery(webhook_id, created_at DESC);
    CREATE INDEX idx_webhook_del_event_id ON webhook_delivery(event_id);
    CREATE INDEX idx_webhook_del_status ON webhook_delivery(status, next_retry_at) WHERE status IN ('pending', 'retrying');
    CREATE INDEX idx_webhook_del_created ON webhook_delivery(created_at DESC);
  `);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Drop all tables in reverse order
  await queryInterface.sequelize.query(`
    DROP TABLE IF EXISTS webhook_delivery CASCADE;
    DROP TABLE IF EXISTS webhook CASCADE;
    DROP TABLE IF EXISTS event CASCADE;
    DROP TABLE IF EXISTS event_type CASCADE;
    DROP TABLE IF EXISTS user_impersonation_session CASCADE;
    DROP TABLE IF EXISTS environment_role_assignment CASCADE;
    DROP TABLE IF EXISTS role_permission CASCADE;
    DROP TABLE IF EXISTS permission CASCADE;
    DROP TABLE IF EXISTS role CASCADE;
    DROP TABLE IF EXISTS group_member CASCADE;
    DROP TABLE IF EXISTS "group" CASCADE;
    DROP TABLE IF EXISTS organization_member CASCADE;
    DROP TABLE IF EXISTS user_session CASCADE;
    DROP TABLE IF EXISTS device CASCADE;
    DROP TABLE IF EXISTS magic_link_token CASCADE;
    DROP TABLE IF EXISTS environment CASCADE;
    DROP TABLE IF EXISTS organization CASCADE;
    DROP TABLE IF EXISTS external_identity CASCADE;
    DROP TABLE IF EXISTS "user" CASCADE;
    DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
    DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE;
  `);
}
