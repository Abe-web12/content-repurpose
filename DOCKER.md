# Docker Guide

## Overview

The Docker setup provides a production-grade container environment for RepurposeAI with multi-stage builds, security hardening, and minimal image size.

## Image Structure

```
node:22-alpine (base)
  │
  ├── Stage 1: deps
  │   ├── Install production dependencies
  │   └── Install full dependencies (for build)
  │
  ├── Stage 2: builder
  │   ├── Generate Prisma client
  │   ├── Build Next.js application (standalone)
  │   └── Output: .next/standalone
  │
  └── Stage 3: runner
      ├── node:22-alpine
      ├── Non-root user (appuser:appgroup)
      ├── Healthcheck configured
      ├── tini as init (SIGTERM handling)
      └── Read-only filesystem (tmpfs for cache)
```

## Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage production build |
| `docker-compose.yml` | Local development stack |
| `docker-compose.prod.yml` | Production deployment stack |
| `.dockerignore` | Build context exclusions |
| `docker-entrypoint.sh` | Container startup script |

## Building

### Development

```bash
# Build with local compose
docker compose build app

# Or build directly
docker build -t repurpose-ai:dev --target runner \
  --build-arg NEXT_PUBLIC_APP_URL=http://localhost:3000 \
  .
```

### Production

```bash
# Build with production args
docker build -t ghcr.io/your-org/repurpose-ai:latest \
  --build-arg NEXT_PUBLIC_APP_URL=https://your-domain.com \
  --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_... \
  --build-arg SENTRY_ORG=your-org \
  --build-arg SENTRY_PROJECT=your-project \
  .

# Or use the CI pipeline (recommended)
# Push a git tag and let GitHub Actions build
```

## Running

### Local Development

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Rebuild after changes
docker compose build app
docker compose up -d
```

### Local Services

| Service | Port | Description |
|---------|------|-------------|
| App | 3000 | Next.js application |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache / queue |
| Mailpit | 1025/8025 | SMTP testing server |
| MinIO | 9000/9001 | S3-compatible storage (requires `--profile full`) |

### Production

```bash
# With managed PostgreSQL and Redis (recommended)
docker compose -f docker-compose.prod.yml up -d app

# With self-hosted Redis
docker compose -f docker-compose.prod.yml --profile with-redis up -d

# With custom tag
export TAG=v1.2.3
docker compose -f docker-compose.prod.yml up -d
```

## Configuration

### Build Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_APP_URL` | Yes | — | Application public URL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | — | Clerk publishable key |
| `SENTRY_ORG` | No | — | Sentry organization |
| `SENTRY_PROJECT` | No | — | Sentry project |

### Environment Variables

All variables from `.env.example` are used at runtime. The container entrypoint validates `DATABASE_URL` and `REDIS_URL` on startup.

### Entrypoint Behavior

1. Validate required environment variables
2. Generate Prisma client (if missing)
3. Run database migrations (if `ENABLE_MIGRATIONS=true`)
4. Start the Next.js server

## Security

### Container Hardening

- **Non-root user**: Runs as `appuser` (UID 1001)
- **Read-only filesystem**: Production container uses `read_only: true`
- **Dropped capabilities**: `ALL` capabilities dropped, only `NET_BIND_SERVICE` added
- **No new privileges**: `security_opt: no-new-privileges:true`
- **Minimal base**: `node:22-alpine` (~120 MB)
- **No secrets baked**: Secrets injected at runtime via environment variables
- **Healthcheck**: Prevents routing traffic to unhealthy containers

### Base Image

The `node:22-alpine` image is used for all stages:
- ~120 MB compressed size
- Minimal attack surface
- Regular security updates
- `libc6-compat` added for native module compatibility

## Performance

### Image Size

| Stage | Size |
|-------|------|
| deps (unused in final image) | ~1.5 GB |
| builder (unused in final image) | ~2 GB |
| runner (final) | ~550 MB |

### Caching Strategy

- **npm ci**: Uses all layers from `package.json` and `package-lock.json`
- **Prisma generate**: Run before Next.js build to cache layers
- **Docker layer caching**: `COPY` operations ordered by change frequency
- **GitHub Actions cache**: Uses `type=gha` cache for Docker builds

### Startup Time

- Cold start: ~15-30 seconds (Node.js module loading + Prisma generate)
- Warm start: ~3-5 seconds
- Healthcheck start period: 40 seconds (to allow for cold start)

## Troubleshooting

### Build Fails

```bash
# Clear Docker cache
docker builder prune -af

# Check build logs
docker compose build --no-cache app

# Verify node_modules
rm -rf node_modules && npm ci
```

### Container Won't Start

```bash
# Check container logs
docker compose logs app

# Verify environment file
docker compose run --rm app env | grep DATABASE_URL

# Test database connection
docker compose run --rm app npx prisma db execute --stdin <<< "SELECT 1"
```

### Health Check Fails

```bash
# Manual health check
docker compose exec app curl -f http://localhost:3000/api/health

# Check database
docker compose exec app npx prisma db execute --stdin <<< "SELECT 1"

# Check Redis
docker compose exec app node -e "const {redis}=require('@/lib/redis');redis.ping().then(console.log)"
```

### Restart Policy

All production services use `restart: unless-stopped`. Containers will automatically restart on failure.

## Production Compose

The production compose file (`docker-compose.prod.yml`) includes:

| Feature | Implementation |
|---------|---------------|
| Resource limits | CPU/Memory limits per service |
| Restart policy | `unless-stopped` |
| Logging | JSON file driver, 10 MB max per file, 3 files |
| Healthcheck | HTTP check on `/api/health` |
| Security | No new privileges, dropped capabilities, read-only filesystem |
| Networks | Isolated bridge network |
| Secrets | Environment variables via `.env.production` file |
| Update strategy | Pull latest image, recreate container |
