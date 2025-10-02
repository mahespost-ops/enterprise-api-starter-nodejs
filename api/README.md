# API Service

Enterprise-grade REST API built with Node.js, Express, TypeScript, and Sequelize featuring RBAC, JWT authentication, and comprehensive security middleware.

## Technology Stack

- **Runtime**: Node.js 22.x LTS
- **Framework**: Express.js 5.1.0
- **Language**: TypeScript 5.7+
- **ORM**: Sequelize 6.x
- **Database**: PostgreSQL
- **Testing**: Jest 30.x
- **Documentation**: OpenAPI 3.0 (Swagger UI)

## Prerequisites

- Node.js >= 22.0.0
- npm >= 10.0.0
- PostgreSQL >= 14

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
│   ├── config/          # Configuration files
│   ├── constants/       # Application constants
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Express middleware
│   ├── models/          # Sequelize models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   └── server.ts        # Application entry point
├── tests/
│   ├── unit/            # Unit tests
│   └── integration/     # Integration tests
├── api-docs/
│   ├── components/      # OpenAPI components
│   │   └── schemas/     # Data schemas
│   ├── paths/           # API endpoint definitions
│   └── index.yaml       # OpenAPI specification
└── migrations/          # Database migrations
```

## API Documentation

When the server is running, API documentation is available at:

- Swagger UI: `http://localhost:3000/api-docs`
- OpenAPI Spec: `http://localhost:3000/api-docs/openapi.yaml`

## Features

- **Authentication**: JWT-based authentication with refresh tokens
- **Authorization**: Role-Based Access Control (RBAC)
- **Security**: Helmet, CORS, rate limiting, input validation
- **Auditing**: Request logging and audit trails
- **Validation**: Joi-based request validation
- **Error Handling**: Centralized error handling
- **API Documentation**: OpenAPI 3.0 specification with Swagger UI
- **Testing**: Comprehensive unit and integration tests
- **Type Safety**: Full TypeScript coverage

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
