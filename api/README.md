# API Service

Enterprise-grade REST API built with Node.js, Express, TypeScript, and Sequelize featuring RBAC, JWT authentication, and comprehensive security middleware.

## Technology Stack

- **Runtime**: Node.js 24.x LTS
- **Framework**: Express.js 5.1.0
- **Language**: TypeScript 5.7+
- **ORM**: Sequelize 6.x
- **Database**: PostgreSQL 16.x
- **Testing**: Jest 30.x
- **Documentation**: OpenAPI 3.0 (Swagger UI)

## Prerequisites

- Node.js >= 24.0.0
- npm >= 10.0.0
- PostgreSQL >= 16.x

## Getting Started

### Installation

```bash
npm install
```

### Environment Configuration

Copy the example environment file and configure:

```bash
cp .env.example .env
```

Update `.env` with your configuration values.

### Database Migrations

Run database migrations to set up the schema:

```bash
# Apply all pending migrations
npm run db:migrate

# Check migration status
npm run db:migrate:status

# Rollback last migration
npm run db:migrate:undo

# Rollback all migrations
npm run db:migrate:undo:all

# Reset database (undo all + migrate)
npm run db:reset
```

### Development

```bash
# Run in development mode with hot reload
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
npm run format:check
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Build

```bash
# Compile TypeScript to JavaScript
npm run build

# Run production build
npm start
```

## Docker

### Build Image

```bash
docker build -t api:latest .
```

### Run Container

```bash
docker run -p 3000:3000 --env-file .env api:latest
```

## Project Structure

```
api/
├── src/
│   ├── __tests__/           # Test files (collocated)
│   │   ├── helpers/         # Test utilities (auth, constants)
│   │   ├── integration/     # API endpoint tests (31 files)
│   │   └── unit/            # Middleware & utility tests
│   ├── adapters/            # Cloud-agnostic service adapters
│   │   ├── email/           # SendGrid, SMTP, Mock
│   │   ├── queue/           # Pub/Sub, SQS, Kafka, Redis, Memory
│   │   ├── secrets/         # GCP, AWS, Vault, Env, Memory
│   │   └── storage/         # GCS, S3, Local
│   ├── config/              # Configuration files
│   ├── constants/           # Application constants
│   ├── controllers/         # Request handlers
│   │   └── STANDARDS.md     # Controller best practices
│   ├── middleware/          # Express middleware
│   │   └── STANDARDS.md     # Middleware best practices
│   ├── models/              # Sequelize models (14 entities)
│   ├── routes/              # API routes
│   │   └── STANDARDS.md     # Routing best practices
│   ├── services/            # Business logic
│   │   └── STANDARDS.md     # Service layer best practices
│   ├── types/               # TypeScript types
│   ├── utils/               # Utility functions
│   ├── app.ts               # Express app configuration
│   └── server.ts            # Server entry point
├── api-docs/                # OpenAPI 3.0 specification
│   ├── components/          # Reusable schemas (factored)
│   ├── paths/               # API endpoint definitions (factored)
│   └── index.yaml           # Main spec file
├── docs/                    # Architecture documentation (23 files)
│   ├── ENTITY_MODEL.md
│   ├── JWT_TOKEN_STRUCTURE.md
│   ├── AUTHENTICATION_DESIGN.md
│   ├── ADAPTER_PATTERN.md
│   └── progress-tracking/
├── migrations/              # Sequelize database migrations
├── .env.example             # Environment variable template
└── CONTRIBUTING.md          # Developer guide
```

## API Documentation

When the server is running, API documentation is available at:

- Swagger UI: `http://localhost:3000/api-docs`
- OpenAPI Spec: `http://localhost:3000/api-docs/openapi.yaml`

## Features

### Authentication & Security
- **Passwordless Authentication**: Magic link delivery via email/SMS with 6-digit verification codes
- **JWT Tokens**: Access tokens (15min) + refresh tokens (30 days) with rotation
- **Device Fingerprinting**: Client-generated fingerprints with trust status tracking
- **Session Management**: Device-bound sessions with granular revocation
- **Rate Limiting**: Multi-layer per endpoint, IP, device, and user tracking

### Multi-Tenancy & Authorization
- **Hierarchical RBAC**: Organization → Environment → Groups → Users
- **Permission System**: Granular `{resource}:{action}` permissions
- **User Impersonation**: System-wide and organization-scoped with full audit trails
- **Context Switching**: Seamless tenant context switching with JWT validation

### Event Logging & Webhooks
- **W3C Activity Streams**: Actor + Verb + Object + Target event model
- **Write-Ahead Log (WAL)**: Batch buffering with PII redaction
- **CloudEvents 1.0.2**: Standard event payloads with message queue integration
- **Webhook Delivery**: Retry with exponential backoff and HMAC signatures

### Performance & Scalability
- **<200ms Response SLO**: Denormalized reads with strategic indexing
- **Cursor Pagination**: High-volume endpoints (10M+ records)
- **Cloud-Agnostic Adapters**: Email, Secrets, Storage, Queue (GCP/AWS/Local)
- **12-Factor Design**: Stateless services with structured logging

### Developer Experience
- **OpenAPI 3.0 Spec**: 106 endpoints across 14 resource groups
- **Comprehensive Tests**: 97.7% passing (169/173) with TDD approach
- **TypeScript**: Full type coverage with strict mode
- **Component Standards**: STANDARDS.md files for controllers, services, routes, middleware

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run production server |
| `npm test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Generate test coverage report |
| `npm run lint` | Lint code |
| `npm run lint:fix` | Lint and fix code |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run db:migrate` | Apply all pending database migrations |
| `npm run db:migrate:status` | Check migration status |
| `npm run db:migrate:undo` | Rollback last migration |
| `npm run db:migrate:undo:all` | Rollback all migrations |
| `npm run db:reset` | Reset database (undo all + migrate) |

## Architecture Principles

### Security
- Never expose password hashes, fingerprint hashes, or internal IDs in API responses
- System-managed fields (trustStatus, roles, permissions) are not user-modifiable
- Full audit trails for all operations including impersonation chains
- JWT validation ensures tenant context (orgId/envId) matches path parameters

### Field Naming Consistency
- **API Layer**: camelCase (controller, service, validation)
- **Database Layer**: snake_case (Sequelize handles automatic mapping)
- No field transformations allowed - maintain consistency across all layers

### Performance (<200ms SLO)
- Denormalize reads where appropriate (e.g., event table stores org/env names)
- Cursor pagination for high-volume endpoints (10M+ records)
- Eager loading to avoid N+1 queries
- Strategic indexing on foreign keys and frequently filtered/sorted fields

### Separation of Concerns
- **Route**: Endpoint definition + middleware chain → delegates to controller
- **Controller**: HTTP layer (req/res) → extracts params → delegates to service
- **Service**: Business logic + orchestration → calls models/adapters
- **Model**: Database entities (Sequelize ORM) → persistence, associations, validation
- **Adapter**: External services → provider-agnostic interfaces

## Documentation

For comprehensive documentation, see:
- **Entity Model**: `docs/ENTITY_MODEL.md` - Complete database schema
- **JWT Structure**: `docs/JWT_TOKEN_STRUCTURE.md` - Token format & impersonation
- **Auth Design**: `docs/AUTHENTICATION_DESIGN.md` - Passwordless auth flow
- **Adapter Pattern**: `docs/ADAPTER_PATTERN.md` - Cloud-agnostic services
- **Contributing**: `CONTRIBUTING.md` - Developer guide and workflow
- **Component Standards**: `src/{component}/STANDARDS.md` - Best practices per component type
