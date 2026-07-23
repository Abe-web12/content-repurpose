# Local Development Guide

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 22+ | Runtime |
| npm | 10+ | Package manager |
| Docker | 24+ | Local services (optional) |
| PostgreSQL | 16+ | Database (or use Docker) |
| Git | 2+ | Version control |

## Quick Start

```bash
# 1. Clone
git clone https://github.com/your-org/repurpose-ai.git
cd repurpose-ai

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env.local
# Edit .env.local with your keys

# 4. Generate Prisma client
npx prisma generate

# 5. Push schema to database
npx prisma db push

# 6. Start development server
npm run dev
```

The app will be available at `http://localhost:3000`.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

See `.env.example` for the full list of required variables. At minimum, you need:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (from Clerk dashboard) |
| `CLERK_SECRET_KEY` | Clerk secret key (from Clerk dashboard) |
| `REDIS_URL` | Upstash Redis URL (or `redis://localhost:6379` for local Redis) |
| `REDIS_TOKEN` | Upstash Redis token (leave empty for local Redis) |

## Running Locally (Without Docker)

### Database (PostgreSQL)

```bash
# Option 1: Use Neon (recommended — free tier available)
# Set DATABASE_URL in .env.local from Neon dashboard

# Option 2: Local PostgreSQL
createdb repurpose
export DATABASE_URL="postgresql://localhost:5432/repurpose"

# Option 3: Docker PostgreSQL
docker run -d \
  --name repurpose-pg \
  -e POSTGRES_USER=repurpose \
  -e POSTGRES_PASSWORD=repurpose \
  -e POSTGRES_DB=repurpose \
  -p 5432:5432 \
  postgres:16-alpine
```

### Redis

```bash
# Option 1: Upstash (recommended — free tier available)
# Set REDIS_URL and REDIS_TOKEN in .env.local from Upstash dashboard

# Option 2: Local Redis
redis-server

# Option 3: Docker Redis
docker run -d --name repurpose-redis -p 6379:6379 redis:7-alpine
```

### Email Testing

```bash
# Using Mailpit (Docker)
docker run -d \
  --name repurpose-mailpit \
  -p 1025:1025 \
  -p 8025:8025 \
  axllent/mailpit

# Set in .env.local:
# RESEND_API_KEY=re_test_...  (Resend test key)
# Or configure Mailpit SMTP
```

### Start

```bash
npm run dev
```

## Running Locally (With Docker Compose)

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Run migrations
docker compose exec app npx prisma db push

# Open shell
docker compose exec app sh

# Stop
docker compose down
```

The app will be available at `http://localhost:3000`.

### Services

| Service | URL | Credentials |
|---------|-----|-------------|
| App | http://localhost:3000 | — |
| PostgreSQL | localhost:5432 | `repurpose` / `repurpose` |
| Redis | localhost:6379 | — |
| Mailpit UI | http://localhost:8025 | — |
| MinIO Console | http://localhost:9001 | `minioadmin` / `minioadmin` |

## Development Scripts

```bash
npm run dev           # Start dev server with hot reload
npm run build         # Production build
npm start             # Start production server
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run lint          # Run ESLint
npm run db:generate   # Regenerate Prisma client
npm run db:push       # Push schema to database
npm run db:studio     # Open Prisma Studio
```

## Testing

### Unit Tests

```bash
# Run all tests
npm test

# Run specific test file
npx vitest run tests/billing/marketplace-connect.test.ts

# Run with watch mode
npm run test:watch

# With coverage
npx vitest run --coverage
```

### E2E Tests

```bash
# Install Playwright browsers
npx playwright install

# Run E2E tests
npx playwright test

# Run with UI
npx playwright test --ui
```

## Database Workflow

### Schema Changes

```bash
# 1. Edit prisma/schema.prisma

# 2. Generate migration
npx prisma migrate dev --name describe_change

# 3. Apply migration
npx prisma migrate dev

# 4. Generate client
npx prisma generate
```

### Seeding

```bash
# Run seed script
npx prisma db seed

# Reset database (CAUTION: destroys data)
npx prisma migrate reset
```

## Common Issues

### Prisma Client Not Found

```bash
npx prisma generate
```

### Database Connection Refused

```bash
# Check if PostgreSQL is running
pg_isready

# Or for Docker
docker ps | grep postgres

# Verify connection string in .env.local
```

### Redis Connection Refused

```bash
# Check if Redis is running
redis-cli ping

# Or for Docker
docker ps | grep redis

# For Upstash, verify REDIS_URL and REDIS_TOKEN in .env.local
```

### Port Already in Use

```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process
taskkill /PID <PID> /F
```

### Module Not Found

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

---

## Project Structure

```
├── app/                    # Next.js App Router pages & API routes
│   ├── api/               # API routes
│   └── (pages)            # Page components
├── components/             # React components
├── lib/                    # Shared libraries and utilities
│   ├── ai/                # AI pipeline (generation, queue, providers)
│   ├── analytics/         # Analytics engine, alerts
│   ├── billing/           # Stripe, subscriptions, credits
│   ├── notifications/     # Push, email, in-app notifications
│   ├── stripe/            # Stripe API utilities
│   └── utils/             # Common utilities
├── prisma/                 # Database schema and migrations
├── public/                 # Static assets
├── tests/                  # Test files
├── Dockerfile              # Production Docker build
├── docker-compose.yml      # Local development services
└── docker-compose.prod.yml # Production deployment
```
