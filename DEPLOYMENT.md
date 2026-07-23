# Deployment Guide

## Supported Targets

- [Vercel](#vercel) — Recommended for frontend + API routes
- [Railway](#railway) — Full-stack deployment
- [Render](#render) — Full-stack deployment
- [Docker / Self-Hosted](#docker--self-hosted) — VPS, dedicated, or on-premise

---

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | 22+ |
| npm | 10+ |
| Docker (self-hosted) | 24+ |
| PostgreSQL | 16+ (via Neon, AWS RDS, or self-hosted) |
| Redis | 7+ (via Upstash, Redis Cloud, or self-hosted) |

### Required Accounts & Services

- **Clerk** — Authentication (https://clerk.com)
- **Neon** — PostgreSQL database (https://neon.tech) or any PostgreSQL provider
- **Upstash** — Redis (https://upstash.com) or any Redis provider
- **Stripe** — Payment processing (https://stripe.com)
- **Resend** — Transactional email (https://resend.com)
- **Cloudinary** — Media storage (https://cloudinary.com)
- **Sentry** — Error monitoring (https://sentry.io)
- **MorphLLM** — AI inference (https://morphllm.com) or any OpenAI-compatible provider

---

## Environment Variables

All environment variables are documented in `.env.example`. Create a `.env.production` file:

```bash
cp .env.example .env.production
# Edit .env.production with production values
```

### Required Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/db?sslmode=require"

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...

# AI (use production key)
AI_API_KEY=sk-prod-...
AI_BASE_URL=https://api.morphllm.com/v1
AI_MODEL=morph-glm52-744b

# Stripe (use live keys)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Redis
REDIS_URL=https://your-redis-url.upstash.io
REDIS_TOKEN=your-redis-token

# Sentry
SENTRY_DSN=https://key@o0.ingest.sentry.io/project
NEXT_PUBLIC_SENTRY_DSN=https://key@o0.ingest.sentry.io/project
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project

# Email
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@your-domain.com

# Media
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret

# App
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_APP_NAME=RepurposeAI

# Security
CRON_SECRET=your-cron-secret
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

---

## Vercel

### Setup

1. Push your repository to GitHub
2. Import project in Vercel dashboard
3. Configure environment variables
4. Set framework preset to **Next.js**
5. Build command: `npm run build`
6. Output directory: `.next`
7. Install command: `npm install`

### Environment Variables

Add all variables from `.env.production` in the Vercel dashboard.

### Deploy

```bash
# Automatic: push to main branch
git push origin main

# Manual: Vercel CLI
npx vercel --prod
```

### Cron Jobs

Cron jobs are configured in `vercel.json`. Ensure the `CRON_SECRET` environment variable matches the one used in cron endpoints.

### Health Check

```bash
curl https://your-domain.com/api/health
```

### Rollback

1. Go to Vercel dashboard → Deployments
2. Find the last working deployment
3. Click the three dots → Promote to Production

Or via CLI:
```bash
npx vercel rollback
```

---

## Railway

### Setup

1. Push repository to GitHub
2. Create new project in Railway dashboard
3. Connect GitHub repository
4. Add a PostgreSQL plugin
5. Add all environment variables

### Deploy

```bash
# Automatic: push to main branch
git push origin main

# Manual: Railway CLI
railway up
```

### Health Check

Railway uses the Docker healthcheck defined in the Dockerfile.

### Rollback

1. Railway dashboard → Deployments
2. Click on a previous deployment
3. Click "Promote"

---

## Render

### Setup

1. Push repository to GitHub
2. Create a **Web Service** in Render dashboard
3. Connect GitHub repository
4. Configure:
   - Runtime: **Docker**
   - Build Command: (leave default — uses Dockerfile)
   - Start Command: (leave default — uses Dockerfile)
   - Health Check Path: `/api/health`

### Environment Variables

Add all variables from `.env.production` in the Render dashboard.

### Deploy

```bash
# Automatic: push to main branch
git push origin main

# Manual: Render dashboard → Manual Deploy
```

### Blue/Green Deployments

Render supports blue/green via **Pre-Deploy Hooks**:
1. Go to your service → Settings → Blue/Green
2. Enable "Preview Environments"
3. Configure the health check path

### Rollback

1. Render dashboard → Deploy History
2. Click "Rollback" on a previous deployment

---

## Docker / Self-Hosted

### Prerequisites

- Docker Engine 24+
- Docker Compose v2+
- PostgreSQL 16+ (managed or containerized)
- Redis 7+ (managed or containerized)

### Quick Start (Single Server)

```bash
# 1. Clone and configure
git clone https://github.com/your-org/repurpose-ai.git
cd repurpose-ai
cp .env.example .env.production
# Edit .env.production with production values

# 2. Pull image
docker pull ghcr.io/your-org/repurpose-ai:latest

# 3. Run with production compose
docker compose -f docker-compose.prod.yml up -d

# 4. Verify
curl http://localhost:3000/api/health
```

### Manual Docker Run

```bash
docker run -d \
  --name repurpose-ai \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file .env.production \
  -e NODE_ENV=production \
  -e ENABLE_MIGRATIONS=true \
  ghcr.io/your-org/repurpose-ai:latest
```

### System Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 1 core | 2+ cores |
| RAM | 1 GB | 2+ GB |
| Disk | 2 GB | 10+ GB (with media) |
| Network | 100 Mbps | 1 Gbps |

### Reverse Proxy (Nginx)

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/certs/your-domain.pem;
    ssl_certificate_key /etc/ssl/private/your-domain.key;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/health {
        proxy_pass http://127.0.0.1:3000/api/health;
    }
}
```

### Rollback (Docker)

```bash
# Rollback to previous version
docker compose -f docker-compose.prod.yml down
export TAG=v1.2.1  # Previous version
docker compose -f docker-compose.prod.yml up -d

# Verify
curl http://localhost:3000/api/health
```

---

## Database Migrations

### Production

```bash
# Run pending migrations
npx prisma migrate deploy

# Or with Docker
docker exec repurpose-app npx prisma migrate deploy
```

Migrations are automatically applied on container start when `ENABLE_MIGRATIONS=true`.

---

## Monitoring

### Health Endpoint

```
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-15T10:30:00Z",
  "version": "1.0.0",
  "name": "RepurposeAI",
  "checks": {
    "database": { "status": "ok" },
    "redis": { "status": "ok" },
    "environment": { "status": "ok" }
  }
}
```

### Sentry

Error tracking is configured via `sentry.client.config.ts`, `sentry.server.config.ts`, and `sentry.edge.config.ts`.

### Logging

- **Docker**: `docker compose logs -f app`
- **Vercel**: Integrated in Vercel dashboard
- **Railway**: Integrated in Railway dashboard

---

## Troubleshooting

### Database Connection Issues

```bash
# Verify connection string
npx prisma db execute --stdin <<< "SELECT 1"

# Check if migrations are pending
npx prisma migrate status

# Reset database (CAUTION: destroys data)
npx prisma migrate reset
```

### Application Won't Start

```bash
# Check logs
docker compose logs app

# Verify environment variables
docker exec repurpose-app env | grep -E "^(DATABASE|REDIS|CLERK|STRIPE)"

# Check if port is in use
netstat -tlnp | grep 3000
```

### Health Check Fails

1. Check the health endpoint directly: `curl -v http://localhost:3000/api/health`
2. Verify database is accessible: `npx prisma db execute --stdin <<< "SELECT 1"`
3. Verify Redis is accessible: `redis-cli ping`
4. Check environment variables are set correctly

---

## Security Checklist

- [ ] Use live Stripe keys in production
- [ ] Enable Clerk production mode
- [ ] Set strong `CRON_SECRET`
- [ ] Generate unique `ENCRYPTION_KEY`
- [ ] Enable HSTS (`Strict-Transport-Security`)
- [ ] Configure CSP headers (already set in next.config.js)
- [ ] Use environment-specific secrets
- [ ] Rotate secrets regularly
- [ ] Run Docker container as non-root (default)
- [ ] Enable database SSL/TLS
- [ ] Set up monitoring alerts
- [ ] Configure backup strategy
