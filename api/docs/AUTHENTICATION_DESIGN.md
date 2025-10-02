# Passwordless Authentication Design

## Overview
Enterprise passwordless authentication system using magic tokens with device fingerprinting, session management, and comprehensive audit capabilities.

## Architecture Components

### 1. Magic Token Authentication

#### Token Delivery
- **Dual Channel Support**: Email and SMS
- **User Preference**: Stored per user, defaults to email
- **Fallback**: Email as primary, SMS as secondary if configured

#### Token Format (Best Practice)
- **Length**: 32 bytes (256-bit) cryptographically secure random
- **Encoding**: Base64 URL-safe for email/SMS links
- **Signed URL**: `https://app.example.com/auth/verify?token={token}&signature={hmac}`
- **Code Display**: 6-digit numeric code for manual entry (derived from token hash)
- **Why**: Industry standard used by AWS, GitHub, Slack for security + UX balance

#### Token Lifecycle
- **TTL (Environment-Based)**:
  - Development: 1 day (86400s)
  - Staging: 1 day (86400s)
  - Production: 15 minutes (900s)
- **Single Use**: Tokens invalidated after successful verification or expiration
- **Storage**: Hash stored in database (bcrypt/argon2), never plaintext

#### Rate Limiting (Configurable by Endpoint & Environment)

Rate limits are configurable per endpoint type and environment via configuration files.

**Configuration Structure**:
```typescript
interface RateLimitConfig {
  endpoint: string;           // e.g., '/auth/request-token', '/api/*'
  limits: {
    perEmail?: { max: number; windowMs: number };
    perIP?: { max: number; windowMs: number };
    perDevice?: { max: number; windowMs: number };
    perUser?: { max: number; windowMs: number };
  };
  lockout?: {
    enabled: boolean;
    strategy: 'exponential' | 'fixed';
    baseDelayMs: number;
  };
}
```

**Default Limits by Endpoint Type**:

1. **Authentication Endpoints** (High Security)
   - `POST /auth/request-token`
     - Production: 3 per email/15min, 10 per IP/15min, 5 per device/15min
     - Staging: 10 per email/15min, 30 per IP/15min
     - Development: 100 per email/15min, 1000 per IP/15min
   - `POST /auth/verify-token`
     - Production: 5 attempts per token, 10 per IP/15min
     - Staging: 10 attempts per token, 30 per IP/15min
     - Development: Unlimited
   - `POST /auth/register`
     - Production: 3 per email/hour, 5 per IP/hour
     - Staging: 10 per email/hour, 20 per IP/hour
     - Development: Unlimited

2. **API Endpoints** (Standard Protection)
   - General authenticated endpoints
     - Production: 100 per user/minute, 1000 per IP/minute
     - Staging: 500 per user/minute, 5000 per IP/minute
     - Development: Unlimited

3. **Public Endpoints** (Moderate Protection)
   - `GET /health`, `GET /api-docs`
     - Production: 60 per IP/minute
     - Staging: 300 per IP/minute
     - Development: Unlimited

4. **Admin Endpoints** (Custom Limits)
   - `DELETE /admin/*`, `POST /admin/*`
     - Production: 30 per user/minute (more permissive for ops)
     - Staging: 100 per user/minute
     - Development: Unlimited

**Lockout Strategy**:
- **Exponential Backoff**: Delays increase exponentially (1min → 2min → 4min → 8min)
- **Max Lockout**: 1 hour for auth endpoints, 15 minutes for API endpoints
- **Reset**: Automatic after successful request or manual admin override

**Configuration Files** (per environment):
```
src/config/rate-limits.dev.ts
src/config/rate-limits.staging.ts
src/config/rate-limits.prod.ts
```

**Why**: Prevents enumeration attacks and abuse while allowing legitimate retries. Environment-specific configs enable aggressive testing in dev/staging without compromising production security.

### 2. Device Fingerprinting & Registration

#### Fingerprint Composition
```json
{
  "userAgent": "Mozilla/5.0...",
  "timezone": "America/New_York",
  "acceptLanguage": "en-US,en;q=0.9",
  "screenResolution": "1920x1080",
  "colorDepth": 24
}
```

#### Device Identification Strategy
- **Flexible Matching**: 10-minute window for timestamp, fuzzy match on User-Agent major version
- **Hash**: SHA-256 of normalized fingerprint components
- **Client Library**: Optional integration with FingerprintJS or similar for enhanced accuracy
- **Why**: Balance between security and UX (handles browser updates, VPN changes)

#### New Device Flow
1. Device fingerprint not recognized → Flag as new device
2. Generate magic token with `newDevice: true` flag
3. Complete authentication
4. **Trigger notification** to all existing user devices/email: "New device logged in from {location} on {device}"
5. Include one-click "This wasn't me" revocation link
6. Auto-trust device after successful auth

#### Device Management
- **User-Defined Names**: Optional, defaults to parsed User-Agent (e.g., "Chrome on macOS")
- **Metadata Tracked**:
  - Device name (user-defined or auto-generated)
  - Fingerprint hash
  - First seen timestamp
  - Last used timestamp
  - Trust status (trusted, pending, revoked)
  - Location (city/country from GeoIP)
  - IP address (last used)

#### Device Limits (Best Practice)
- **Default**: 10 active devices per user
- **Configurable**: Via user plan/tier (upsell opportunity)
  - Free tier: 3 devices
  - Pro tier: 10 devices
  - Enterprise: Unlimited
- **Enforcement**: Oldest unused device auto-revoked when limit exceeded
- **Why**: Balances security, cost, and user convenience

### 3. Session Management

#### Token Architecture (Best Practice: Short-lived + Refresh)
- **Access Token**:
  - Lifespan: 15 minutes
  - Format: JWT (stateless)
  - Payload: `userId`, `deviceId`, `sessionId`, `roles`, `iat`, `exp`
  - Storage: Client memory only (not localStorage for XSS protection)

- **Refresh Token**:
  - Lifespan: 30 days (sliding window)
  - Format: Opaque token (256-bit random)
  - Storage: Database with device binding
  - Client Storage: httpOnly, secure, SameSite=Strict cookie
  - Rotation: New refresh token issued on each use (one-time use)

- **Why**: Industry standard (OAuth 2.0, OIDC), minimizes impact of token theft

#### Session Data Model
```typescript
interface Session {
  id: string;              // UUID
  userId: string;          // User ID
  deviceId: string;        // Device ID
  refreshTokenHash: string; // Hashed refresh token

  // Security metadata
  ipAddress: string;
  userAgent: string;
  geoLocation: {
    country: string;
    region: string;
    city: string;
    coordinates: { lat: number; lon: number };
  };

  // Timestamps
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;

  // Activity metrics
  requestCount: number;
  lastActivityType: string; // e.g., 'read', 'write', 'delete'

  // Status
  isActive: boolean;
  revokedAt?: Date;
  revokedBy?: string;      // userId who revoked (for admin actions)
  revocationReason?: string;
}
```

#### Concurrent Sessions (Best Practice)
- **Per Device**: 1 active session (new login invalidates previous)
- **Across Devices**: Unlimited (within device limit)
- **Why**: Prevents session hijacking on same device, allows multi-device usage

#### Session Revocation Capabilities
1. **Self-Service (User)**:
   - Revoke individual session by ID
   - Revoke all sessions on specific device
   - Revoke all sessions except current
   - Revoke all sessions globally (logout everywhere)

2. **Administrative (Admin/Manager)**:
   - All above capabilities for any user
   - Bulk revocation by user ID
   - Bulk revocation by criteria (e.g., all sessions from country, date range)
   - Audit trail for all revocations

3. **Automatic Revocation**:
   - Session expired (30 days no activity)
   - Device limit exceeded (oldest unused)
   - Suspicious activity detected (optional future enhancement)
   - User account deactivated
   - Password/auth method changed

#### Session Monitoring & Analytics
- **Real-time Data** (minimal performance impact):
  - Active session count per user
  - Current device/location per session
  - Last activity timestamp
  - Request count (rate limiting input)

- **Aggregated Metrics** (async processing):
  - Session duration distribution
  - Geographic usage patterns
  - Device type distribution
  - Peak usage times
  - Authentication success/failure rates

- **Performance Optimization**:
  - Session data cached in Redis (15-min TTL matching access token)
  - Analytics processed via background jobs (avoid real-time overhead)
  - GeoIP lookup cached per IP (24-hour TTL)

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE,

  -- Preferences
  preferred_auth_method VARCHAR(10) DEFAULT 'email', -- 'email', 'sms'
  timezone VARCHAR(50),

  -- Role-Based Access Control
  role VARCHAR(20) DEFAULT 'user', -- 'user', 'manager', 'admin'

  -- Plan/Tier (for device limits)
  plan VARCHAR(20) DEFAULT 'free', -- 'free', 'pro', 'enterprise'
  max_devices INT DEFAULT 3,

  -- Profile
  first_name VARCHAR(50),
  last_name VARCHAR(50),

  -- Status
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP,

  -- Indexes
  INDEX idx_email (email),
  INDEX idx_phone (phone),
  INDEX idx_role (role),
  INDEX idx_active (is_active)
);
```

### Magic Tokens Table
```sql
CREATE TABLE magic_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Token data
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  code_hash VARCHAR(255) NOT NULL, -- 6-digit code hash

  -- Delivery
  delivery_method VARCHAR(10) NOT NULL, -- 'email', 'sms'
  sent_to VARCHAR(255) NOT NULL,

  -- Context
  device_fingerprint_hash VARCHAR(64),
  ip_address INET,
  user_agent TEXT,
  is_new_device BOOLEAN DEFAULT false,

  -- Lifecycle
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  attempts INT DEFAULT 0,

  -- Status
  is_valid BOOLEAN DEFAULT true,

  -- Indexes
  INDEX idx_token_hash (token_hash),
  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at),
  INDEX idx_device_fingerprint (device_fingerprint_hash)
);
```

### Devices Table
```sql
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Identification
  fingerprint_hash VARCHAR(64) UNIQUE NOT NULL,

  -- Metadata
  device_name VARCHAR(100), -- User-defined or auto-generated
  device_type VARCHAR(20), -- 'desktop', 'mobile', 'tablet'
  os VARCHAR(50),
  browser VARCHAR(50),

  -- Raw fingerprint components (for debugging)
  user_agent TEXT,
  timezone VARCHAR(50),
  screen_resolution VARCHAR(20),

  -- Security
  trust_status VARCHAR(20) DEFAULT 'trusted', -- 'trusted', 'pending', 'revoked'
  first_seen_ip INET,
  last_seen_ip INET,

  -- Location (from GeoIP)
  last_country VARCHAR(2),
  last_region VARCHAR(100),
  last_city VARCHAR(100),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP,

  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_fingerprint_hash (fingerprint_hash),
  INDEX idx_trust_status (trust_status),
  INDEX idx_last_used_at (last_used_at)
);
```

### Sessions Table
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,

  -- Token
  refresh_token_hash VARCHAR(255) UNIQUE NOT NULL,

  -- Security context
  ip_address INET NOT NULL,
  user_agent TEXT,

  -- Location (from GeoIP)
  geo_country VARCHAR(2),
  geo_region VARCHAR(100),
  geo_city VARCHAR(100),
  geo_coordinates POINT,

  -- Activity tracking
  request_count INT DEFAULT 0,
  last_activity_type VARCHAR(50),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  last_accessed_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,

  -- Revocation
  is_active BOOLEAN DEFAULT true,
  revoked_at TIMESTAMP,
  revoked_by UUID REFERENCES users(id),
  revocation_reason TEXT,

  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_device_id (device_id),
  INDEX idx_refresh_token_hash (refresh_token_hash),
  INDEX idx_is_active (is_active),
  INDEX idx_expires_at (expires_at),
  INDEX idx_last_accessed_at (last_accessed_at)
);
```

### Rate Limit Tracking Table
```sql
CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tracking key
  limit_type VARCHAR(20) NOT NULL, -- 'email', 'ip', 'device'
  limit_key VARCHAR(255) NOT NULL, -- email/ip/fingerprint

  -- Counters
  attempt_count INT DEFAULT 1,
  window_start TIMESTAMP DEFAULT NOW(),

  -- Lockout
  locked_until TIMESTAMP,

  -- Composite unique constraint
  UNIQUE(limit_type, limit_key),

  -- Indexes
  INDEX idx_limit_key (limit_type, limit_key),
  INDEX idx_locked_until (locked_until)
);
```

### Audit Log Table
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Actor
  user_id UUID REFERENCES users(id),
  actor_ip INET,
  actor_user_agent TEXT,

  -- Action
  action_type VARCHAR(50) NOT NULL, -- 'auth.token_requested', 'auth.login', 'session.revoked', etc.
  resource_type VARCHAR(50), -- 'user', 'session', 'device'
  resource_id UUID,

  -- Context
  metadata JSONB, -- Flexible additional data

  -- Result
  success BOOLEAN,
  error_message TEXT,

  -- Timestamp
  created_at TIMESTAMP DEFAULT NOW(),

  -- Indexes
  INDEX idx_user_id (user_id),
  INDEX idx_action_type (action_type),
  INDEX idx_created_at (created_at),
  INDEX idx_resource (resource_type, resource_id)
);
```

## API Endpoints Summary

### Authentication Flow
1. `POST /auth/request-token` - Request magic token
2. `POST /auth/verify-token` - Verify magic token, receive access + refresh tokens
3. `POST /auth/refresh` - Refresh access token using refresh token
4. `POST /auth/logout` - Logout (revoke refresh token)

### Device Management
5. `GET /devices` - List user's devices
6. `PUT /devices/:id` - Update device name
7. `DELETE /devices/:id` - Revoke device (deletes all sessions)

### Session Management
8. `GET /sessions` - List user's active sessions
9. `GET /sessions/:id` - Get session details
10. `DELETE /sessions/:id` - Revoke specific session
11. `DELETE /sessions/device/:deviceId` - Revoke all sessions for device
12. `DELETE /sessions/all` - Revoke all sessions except current
13. `DELETE /sessions/all/force` - Revoke all sessions including current

### Admin Endpoints
14. `GET /admin/users/:userId/sessions` - List user's sessions (admin)
15. `DELETE /admin/users/:userId/sessions` - Revoke user's sessions (admin)
16. `GET /admin/analytics/sessions` - Session analytics dashboard

## Security Considerations

1. **Token Storage**: Never store magic tokens or refresh tokens in plaintext (bcrypt/argon2)
2. **Transport**: All endpoints HTTPS only, refresh tokens in httpOnly cookies
3. **Rate Limiting**: Multi-layer (email, IP, device) with exponential backoff
4. **Audit Trail**: Log all authentication events, session changes, admin actions
5. **GeoIP Privacy**: Store country/region/city only, not precise coordinates publicly
6. **Device Fingerprinting**: Intentionally fuzzy to balance security/privacy
7. **Session Fixation**: Rotate refresh tokens on each use (one-time use pattern)
8. **CSRF Protection**: SameSite=Strict cookies + optional CSRF tokens for state-changing operations

## Performance Optimizations

1. **Caching**: Redis for active sessions (TTL = access token expiration)
2. **Database Indexes**: All foreign keys, frequently queried columns
3. **GeoIP Caching**: Cache IP → location mapping (24-hour TTL)
4. **Async Processing**: Send emails/SMS via queue (RabbitMQ/SQS)
5. **Analytics**: Background jobs for aggregation (avoid real-time overhead)
6. **Connection Pooling**: Sequelize pool (min: 5, max: 20)
7. **Query Optimization**: Use database-level aggregations for analytics

## Future Enhancements

1. **Risk-Based Authentication**: ML model for suspicious activity detection
2. **Biometric Support**: WebAuthn/FIDO2 for trusted devices
3. **Adaptive TTLs**: Shorten token lifespans based on risk score
4. **User Behavior Analytics**: Anomaly detection (unusual location, time, activity)
5. **Compliance**: GDPR data export, CCPA deletion workflows
