# TaskHub — Task Management SaaS

Self-hosted TaskHub task management system. Monorepo with NestJS API, React frontend, shared TypeScript types.

## Quick Start

```bash
# 1. Clone and set up environment
cp .env.example .env

# 2. Install dependencies
npm install

# 3. Start all services
docker compose up -d

# 4. Seed demo data
npm run seed

# 5. Open in browser
```

## Available URLs

| Service         | URL                                  | Description               |
|-----------------|--------------------------------------|---------------------------|
| Web App         | http://app.localhost                 | React frontend            |
| API (direct)    | http://api.app.localhost             | NestJS REST API           |
| API (tenant)    | http://acme.app.localhost            | API with tenant context   |
| Swagger Docs    | http://api.app.localhost/api/docs    | OpenAPI documentation     |
| Health Check    | http://api.app.localhost/health      | DB + Redis status         |
| Traefik Dashboard | http://localhost:8080              | Reverse proxy dashboard   |
| Adminer         | http://adminer.app.localhost         | Database management UI    |
| MinIO Console   | http://minio.app.localhost           | Object storage UI         |

## Commands

```bash
npm run dev        # Start all dev servers
npm run build      # Build all packages
npm run seed       # Seed demo data (Acme Corp, 5 users, 20 issues)
npm run test       # Run all tests
npm run typecheck  # TypeScript type checking
```

## Project Structure

```
├── apps/
│   ├── api/                # NestJS modular monolith
│   │   └── src/
│   │       ├── entities/       # TypeORM entities
│   │       ├── modules/        # Feature modules
│   │       ├── middleware/     # Tenant isolation middleware
│   │       ├── filters/       # Global exception filter
│   │       ├── constants/     # App-wide constants
│   │       ├── seed.ts        # Database seeder
│   │       └── main.ts        # Bootstrap
│   └── web/                # React 18 + Vite
├── packages/
│   ├── shared-types/       # Zod schemas + TypeScript types
│   └── ui/                 # Reusable UI components
├── infrastructure/
│   └── postgres/init.sql   # Database schema + RLS
├── docker-compose.yml
└── .env.example
```

## Demo Credentials

All seed users have password: `password123`

| Email              | Role              |
|--------------------|-------------------|
| admin@acme.com     | ADMIN             |
| pm@acme.com        | PROJECT_MANAGER   |
| dev1@acme.com      | DEVELOPER         |
| dev2@acme.com      | DEVELOPER         |
| viewer@acme.com    | VIEWER            |

## Tech Stack

- **API**: NestJS 10, TypeORM, PostgreSQL 16 (RLS), Redis 7
- **Web**: React 18, Vite 5, TypeScript 5
- **Infrastructure**: Docker Compose, Traefik v3, MinIO
- **Validation**: Zod (shared), class-validator (API)

## Documentation

| Document | Description |
|----------|-------------|
| [Deployment Guide](docs/deployment.md) | Full deployment documentation: prerequisites, first run, configuration, SSL, backups, updates, monitoring, troubleshooting |
| [UML Diagrams](docs/uml/README.md) | 9 UML diagrams: ERD, class, sequence (auth, DnD, upload), use case, activity, component, deployment |

