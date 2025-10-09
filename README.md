# Enterprise API Starter (Node.js)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-24.x-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-lightgrey.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.x-blue.svg)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Production-ready, multi-tenant REST API** with hierarchical RBAC, passwordless authentication, comprehensive event logging, webhooks, and cloud-agnostic service adapters. Designed as a reference implementation demonstrating TDD (Test-Driven Development) and enterprise-grade architecture.

Originally conceived as a configuration drift reduction demonstration, this project evolved into a comprehensive example of AI-assisted software development with meticulous context refinement.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT APPLICATION                          │
│                    (Web / Mobile / Third-Party)                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ HTTPS/REST
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY LAYER                           │
│  ┌──────────────┐  ┌───────────┐  ┌──────────┐  ┌───────────────┐   │
│  │ Rate Limiter │→ │   CORS    │→ │  Helmet  │→ │  Compression  │   │
│  └──────────────┘  └───────────┘  └──────────┘  └───────────────┘   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      AUTHENTICATION LAYER                           │
│  ┌────────────────────┐  ┌──────────────────────────────────────┐   │
│  │  JWT Verification  │  │     Device Fingerprinting            │   │
│  │  (Access/Refresh)  │  │     (Trust Status Tracking)          │   │
│  └────────────────────┘  └──────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │         Tenant Context Validation (orgId/envId)             │    │
│  └─────────────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      AUTHORIZATION LAYER                            │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │           Hierarchical RBAC Permission Resolution           │    │
│  │   (Group-based → User-based → Environment-scoped)           │    │
│  └─────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │          Impersonation Chain Validation & Audit             │    │
│  └─────────────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         ROUTING LAYER                               │
│  ┌──────────────────┐  ┌────────────────┐  ┌──────────────────┐     │
│  │  Tenant-Scoped   │  │  Admin Routes  │  │  System Routes   │     │
│  │  /orgs/{orgId}/  │  │  /admin/*      │  │  /health, /docs  │     │
│  │  envs/{envId}/*  │  │                │  │                  │     │
│  └──────────────────┘  └────────────────┘  └──────────────────┘     │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       CONTROLLER LAYER                              │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │    HTTP Request/Response Handling & Validation              │    │
│  │    (Extract params → Delegate to services → Format output)  │    │
│  └─────────────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        SERVICE LAYER                                │
│  ┌──────────────┐  ┌───────────────┐  ┌────────────────────────┐    │
│  │   Business   │  │  Transaction  │  │  External Service      │    │
│  │     Logic    │  │  Management   │  │  Orchestration         │    │
│  │              │  │               │  │  (Adapters)            │    │
│  └──────────────┘  └───────────────┘  └────────────────────────┘    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                ┌────────────┼────────────┐
                │                         │
                ▼                         ▼
┌───────────────────────────┐  ┌────────────────────────────────────┐
│      MODEL LAYER          │  │      ADAPTER LAYER                 │
│  ┌──────────────────────┐ │  │  ┌──────────────────────────────┐  │
│  │  Sequelize ORM       │ │  │  │   Email (SendGrid/SMTP)      │  │
│  │  (PostgreSQL)        │ │  │  │   Secrets (GCP/AWS/Vault)    │  │
│  │                      │ │  │  │   Storage (GCS/S3/Local)     │  │
│  │  - Entities          │ │  │  │   Queue (Pub/Sub/SQS/Kafka)  │  │
│  │  - Associations      │ │  │  └──────────────────────────────┘  │
│  │  - Validations       │ │  │     (Cloud-Agnostic Interfaces)    │
│  └──────────────────────┘ │  └────────────────────────────────────┘
│                           │
│  ┌──────────────────────┐ │
│  │   Event Publisher    │ │────────┐
│  │  (CloudEvents 1.0.2) │ │        │
│  └──────────────────────┘ │        │
└───────────────────────────┘        │
                                     │
                ┌────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      EVENT PROCESSING LAYER                         │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              Write-Ahead Log (WAL) Manager                  │    │
│  │         (Batch buffering + PII redaction + Flush)           │    │
│  └─────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                 Webhook Delivery Queue                      │    │
│  │      (CloudEvents → Retry with Exponential Backoff)         │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘

           ↓ Database              ↓ Message Queue
     ┌──────────────┐        ┌──────────────────┐
     │  PostgreSQL  │        │  Pub/Sub / SQS   │
     │   (Primary)  │        │   / Kafka / etc  │
     └──────────────┘        └──────────────────┘
```

---

## ✨ Features

### 🔐 Enterprise Authentication & Security

- **Passwordless Authentication**
  - Magic link delivery via email/SMS
  - 6-digit verification codes
  - Client-generated device fingerprinting (FingerprintJS/ThumbmarkJS)
  - Automatic new device notifications with "This wasn't me" revocation
  - Environment-specific token TTLs (15min production, 1 day dev/staging)

- **Advanced Session Management**
  - JWT access tokens (15min lifespan) + refresh tokens (30 days)
  - httpOnly, secure, SameSite=Strict cookies
  - Refresh token rotation (one-time use pattern)
  - Device-bound sessions (1 active session per device)
  - Granular revocation (by session, device, or global logout)

- **Multi-Layer Rate Limiting**
  - Configurable per endpoint type and environment
  - Per-email, per-IP, per-device, per-user tracking
  - Exponential backoff with configurable lockout strategies
  - Prevents enumeration attacks and abuse

- **Device Trust Management**
  - Automatic trust status tracking (trusted, pending, revoked)
  - User-defined device names (with fallback to parsed User-Agent)
  - Configurable device limits (10 default, tiered plans)
  - Auto-revocation of oldest unused device when limit exceeded

### 🏢 Multi-Tenancy & Context Boundaries

- **Hierarchical Organization Model**
  - Organization → Environment → Groups → Users
  - Default environments: Live (production) + Test (sandbox)
  - Tenant-scoped endpoints: `/orgs/{orgId}/envs/{envId}/*`
  - JWT-based tenant context validation (prevents cross-tenant access)

- **User Impersonation with Full Audit Trails**
  - **System Impersonation**: Admin access to ANY user across ALL orgs/envs
  - **Organization Impersonation**: Managers impersonate subordinates only (hierarchy-based)
  - **Session Chaining**: Multi-level impersonation (Admin → Manager → User)
  - **Pop Operation**: Revert to parent impersonation level
  - Full chain tracking in JWT + database + event logs

- **Context Switching**
  - Users can belong to multiple orgs/environments
  - Seamless context switching with new JWT issuance
  - Last context stored in `user.last_org_id` / `user.last_env_id`

### 🔒 Hierarchical RBAC (Role-Based Access Control)

- **Granular Permissions**
  - Pattern: `{resource}:{action}` (e.g., `devices:read`, `admin:users:manage`)
  - Categories: Tenant-scoped, Admin-scoped, System-level
  - Environment-scoped role assignments (polymorphic to groups/users)

- **Group-Based Permission Inheritance**
  - Hierarchical groups with `hierarchy_level` tracking
  - Permission resolution: User roles + Group roles (deduplicated)
  - Restrict impersonation to subordinate groups (lower hierarchy level)

- **System Roles**
  - Predefined: Admin, Manager, Member, Viewer
  - Custom roles with permission bundling
  - `is_system` flag prevents accidental deletion

### 📊 Comprehensive Event Logging & Webhooks

- **W3C Activity Streams Model**
  - Actor (who) + Verb (action) + Object (what) + Target (where)
  - Denormalized org/env names for <200ms query SLO
  - Full impersonation context in event actor metadata
  - HTTP audit trail (request/response/headers/IP/user agent)

- **Write-Ahead Log (WAL) with Batch Buffering**
  - In-memory buffer with configurable flush thresholds
  - Batch insert for high-throughput scenarios
  - Automatic PII redaction (passwords, tokens, sensitive headers)
  - Graceful shutdown ensures buffer flush

- **CloudEvents 1.0.2 Message Queue**
  - All events published to queue (Pub/Sub / SQS / Kafka / Redis)
  - CloudEvents spec compliance (`id`, `source`, `type`, `data`, etc.)
  - Impersonation metadata included in event payload

- **Webhook Delivery System**
  - User-configurable webhooks per environment
  - Event subscription filtering (subscribe to specific verbs)
  - Exponential backoff retry (5 attempts: 1min → 5min → 15min → 1hr → 6hr)
  - HMAC signature validation
  - Delivery history and manual retry

### ⚡ Performance & Scalability

- **<200ms Response Time SLO**
  - Denormalized reads (event table stores org/env names)
  - Cursor-based pagination for 10M+ record endpoints
  - Sequelize eager loading to prevent N+1 queries
  - Strategic indexing (foreign keys, frequently filtered/sorted fields)

- **Cloud-Agnostic Adapter Pattern**
  - Email: SendGrid, SMTP, Mock
  - Secrets: GCP Secret Manager, AWS Secrets Manager, Vault, Env Variables, Memory
  - Storage: Google Cloud Storage, AWS S3, Local Filesystem
  - Queue: Pub/Sub, SQS, Kafka, Redis, In-Memory
  - Factory pattern for runtime provider switching

### 🧪 Test-Driven Development (TDD)

- **Comprehensive Test Coverage**
  - 31 test files covering 106+ API endpoints
  - 97.7% passing (169/173 tests) - 4 intentionally skipped with documentation
  - AAA pattern (Arrange, Act, Assert)
  - Test helpers for JWT generation, magic token extraction, permission checks

- **Test Organization**
  - Phase 1: Middleware (49/49 passing) ✅
  - Phase 2: Endpoints (120/120 passing) ✅
    - Batch 1: Auth (36/36) ✅
    - Batch 2: Users (36/36) ✅
    - Batch 3: Orgs/Envs (48/48) ✅
  - Collocated with source code (`src/__tests__/`)

### 📚 Developer Experience

- **Extensive Documentation**
  - 23+ markdown files in `api/docs/`
  - Component STANDARDS.md files (controllers, services, routes, middleware, tests)
  - Architecture docs (entity model, JWT structure, auth design, adapter pattern)
  - OpenAPI 3.0 specification (106 endpoints across 14 resource groups)
  - Interactive Swagger UI at `/api-docs`

- **Code Quality Tooling**
  - TypeScript 5.7 with strict mode
  - ESLint + Security plugin
  - Prettier for formatting
  - 196 source files, zero magic strings (centralized constants)
  - File size limits enforced (<500 lines recommended, 1000 max)

- **12-Factor Methodology**
  - Configuration via environment variables
  - Stateless services (sessions in DB, not memory)
  - Structured logging to stdout (Winston)
  - Graceful shutdown with cleanup handlers

---

## 🚀 Quick Start

### Prerequisites

- Node.js ≥ 24.0.0
- PostgreSQL ≥ 16.x
- npm ≥ 10.0.0

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/enterprise-api-starter-nodejs.git
cd enterprise-api-starter-nodejs/api

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your database credentials and secrets

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

The API will be available at `http://localhost:3000` with Swagger UI at `http://localhost:3000/api-docs`.

### Running Tests

```bash
# Run all tests
npm test

# Watch mode (auto-rerun on file changes)
npm run test:watch

# Coverage report
npm run test:coverage
```

### Code Quality Checks

```bash
# TypeScript type checking
npm run typecheck

# Lint for errors
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format with Prettier
npm run format
```

---

## 📖 User Stories

### As an API Consumer

- **I want to authenticate without passwords** so that I can access my account securely without remembering complex credentials
- **I want to receive a magic link via email or SMS** so that I can verify my identity and log in quickly
- **I want my devices to be automatically recognized** so that I don't need to re-verify on trusted devices
- **I want to manage my active sessions** so that I can revoke access from lost or stolen devices
- **I want to switch between organizations and environments** so that I can manage multiple tenants from a single account

### As an Organization Administrator

- **I want to invite users to my organization** so that I can grant team members access to our resources
- **I want to organize users into hierarchical groups** so that I can manage permissions efficiently
- **I want to assign roles at the environment level** so that users have different permissions in Live vs Test environments
- **I want to impersonate users in subordinate groups** so that I can troubleshoot issues and provide support
- **I want to view audit logs of all user actions** so that I can ensure compliance and investigate security incidents

### As a System Administrator

- **I want to impersonate any user across any organization** so that I can provide customer support and resolve issues
- **I want to track impersonation chains with full audit trails** so that I have complete accountability for all actions
- **I want to force-revoke user sessions** so that I can respond to security incidents immediately
- **I want to monitor webhook deliveries and retry failures** so that I can ensure event notifications are reliable
- **I want to configure rate limits per environment** so that I can prevent abuse while allowing testing flexibility

### As a Developer Integrating with the API

- **I want comprehensive OpenAPI documentation** so that I can understand all available endpoints and schemas
- **I want webhook notifications for important events** so that my application can react to changes in real-time
- **I want CloudEvents-compliant event payloads** so that I can integrate with standard event processing tools
- **I want consistent camelCase field names across all API responses** so that my frontend code is predictable
- **I want cursor-based pagination for high-volume endpoints** so that I can efficiently process large datasets

### As a DevOps Engineer

- **I want cloud-agnostic service adapters** so that I can deploy to GCP, AWS, or on-premises without code changes
- **I want environment-specific configuration** so that I can tune rate limits and TTLs per deployment stage
- **I want structured logs to stdout** so that I can integrate with centralized logging platforms (Stackdriver, CloudWatch, Splunk)
- **I want database migrations with rollback support** so that I can safely deploy schema changes
- **I want graceful shutdown handlers** so that in-flight requests complete and buffers flush before termination

### As a Security Auditor

- **I want complete impersonation audit trails** so that I can verify who performed actions on behalf of whom
- **I want PII redaction in event logs** so that sensitive data is not stored in plaintext
- **I want device fingerprinting and trust status tracking** so that I can identify suspicious authentication patterns
- **I want HMAC-signed webhook payloads** so that I can verify event authenticity
- **I want rate limiting with exponential backoff** so that brute-force attacks are automatically mitigated

### Aa a Business Owner or FinOps Lead

- **I want to save money** by enabling local development and remaining host agnostic
- **I want efficient cloud operations** by patching vulnerabilities that could run up my bill

---

## 🗂️ Project Structure

```
enterprise-api-starter-nodejs/
├── api/                              # API application
│   ├── src/
│   │   ├── __tests__/                # Test files (collocated)
│   │   │   ├── helpers/              # Test utilities (auth, constants)
│   │   │   ├── integration/          # API endpoint tests (31 files)
│   │   │   └── unit/                 # Middleware & utility tests
│   │   ├── adapters/                 # Cloud-agnostic service adapters
│   │   │   ├── email/                # SendGrid, SMTP, Mock
│   │   │   ├── queue/                # Pub/Sub, SQS, Kafka, Redis, Memory
│   │   │   ├── secrets/              # GCP, AWS, Vault, Env, Memory
│   │   │   └── storage/              # GCS, S3, Local
│   │   ├── config/                   # Configuration & database setup
│   │   ├── constants/                # HTTP status, errors, auth constants
│   │   ├── controllers/              # HTTP request/response handlers
│   │   │   └── STANDARDS.md          # Controller best practices
│   │   ├── middleware/               # Auth, RBAC, validation, error handling
│   │   │   └── STANDARDS.md          # Middleware best practices
│   │   ├── models/                   # Sequelize ORM models (14 entities)
│   │   ├── routes/                   # RESTful route definitions
│   │   │   └── STANDARDS.md          # Routing best practices
│   │   ├── services/                 # Business logic & orchestration
│   │   │   └── STANDARDS.md          # Service layer best practices
│   │   ├── types/                    # TypeScript type definitions
│   │   ├── utils/                    # Helper functions
│   │   ├── app.ts                    # Express app configuration
│   │   └── server.ts                 # Server entry point
│   ├── api-docs/                     # OpenAPI 3.0 specification
│   │   ├── index.yaml                # Main spec file
│   │   ├── paths/                    # Endpoint definitions (factored)
│   │   └── components/               # Reusable schemas (factored)
│   ├── docs/                         # Architecture documentation (23 files)
│   │   ├── ENTITY_MODEL.md           # Complete database schema
│   │   ├── JWT_TOKEN_STRUCTURE.md    # Token format & impersonation
│   │   ├── AUTHENTICATION_DESIGN.md  # Passwordless auth flow
│   │   ├── ADAPTER_PATTERN.md        # Cloud-agnostic design
│   │   ├── ADAPTER_USAGE.md          # Adapter implementation guide
│   │   ├── QUERY_PARAMETER_STANDARDS.md # API query conventions
│   │   └── progress-tracking/        # Implementation status
│   ├── migrations/                   # Sequelize database migrations
│   ├── .env.example                  # Environment variable template
│   ├── package.json                  # Dependencies & scripts
│   ├── tsconfig.json                 # TypeScript configuration
│   ├── jest.config.js                # Jest test configuration
│   └── CONTRIBUTING.md               # Developer guide
├── infra/                            # Terraform infrastructure (future)
├── CLAUDE.md                         # AI assistant context & guidelines
└── README.md                         # This file
```

---

## 📊 System Statistics

| Metric | Value |
|--------|-------|
| **Total Endpoints** | 106 (across 14 resource groups) |
| **Source Files** | 196 TypeScript files |
| **Test Files** | 36 test suites |
| **Test Coverage** | 97.7% (1066 passing) |
| **Documentation Files** | 23+ markdown files |
| **Database Entities** | 14 core models |
| **Supported Cloud Providers** | Local, GCP, AWS, Agnostic (via adapters) |
| **API Response SLO** | <200ms (achieved via denormalization) |

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js 24.x |
| **Language** | TypeScript 5.7 |
| **Framework** | Express 5.x |
| **Database** | PostgreSQL 16.x |
| **ORM** | Sequelize 6.x |
| **Authentication** | JWT + Magic Links |
| **Testing** | Jest 30.x + Supertest |
| **Validation** | Joi 18.x |
| **Logging** | Winston 3.x |
| **Security** | Helmet, bcrypt, express-rate-limit |
| **API Docs** | OpenAPI 3.0 + Swagger UI |

---

## 🤝 Contributing

This project follows strict code quality standards and TDD practices. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for detailed guidelines.

**Key Principles:**
1. Always reference component STANDARDS.md files before creating new code
2. Follow TDD: Write failing test → Implement → Refactor
3. Run `npm run typecheck && npm run lint && npm test` before committing
4. Keep files under 500 lines (max 1000) - refactor if exceeding
5. Use centralized constants (no magic strings)
6. Maintain camelCase in API layer, snake_case in database layer

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Inspired by [typescript-postgres-auth-example](https://github.com/mikesparr/typescript-postgres-auth-example)
- Built with Test-Driven Development (TDD) and AI-assisted context refinement
- Demonstrates enterprise-grade architecture patterns for Node.js/TypeScript APIs

---

## 📞 Support

For questions, issues, or contributions:
- **Issues**: [GitHub Issues](https://github.com/yourusername/enterprise-api-starter-nodejs/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/enterprise-api-starter-nodejs/discussions)
- **Documentation**: See [`api/docs/`](./api/docs/) for comprehensive guides

---

**Built with ❤️ using TypeScript, Express, and PostgreSQL**
