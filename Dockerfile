# =============================================================================
# RepurposeAI — Production Dockerfile
# Multi-stage: deps → builder → runner
# =============================================================================

# ---- Stage 1: Dependencies ----
FROM node:22-alpine AS deps
LABEL stage=deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production && \
    cp -r node_modules /tmp/node_modules-production && \
    npm ci

# ---- Stage 2: Builder ----
FROM node:22-alpine AS builder
LABEL stage=builder

WORKDIR /app

# Copy full dependency tree (including devDependencies)
COPY --from=deps /app/node_modules ./node_modules

# Copy source files
COPY . .

# Copy Prisma schema for client generation
COPY prisma ./prisma

# Environment variable required at build time (can be overridden)
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV SENTRY_ORG=$SENTRY_ORG
ENV SENTRY_PROJECT=$SENTRY_PROJECT
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV SENTRY_SUPPRESS_GLOBAL_ERROR_HANDLER_FILE_WARNING=1

# Generate Prisma client and build
RUN npx prisma generate && \
    npm run build

# ---- Stage 3: Runner ----
FROM node:22-alpine AS runner
LABEL maintainer="RepurposeAI Team"
LABEL description="RepurposeAI — AI Content Repurposing Platform"
LABEL org.opencontainers.image.source="https://github.com/abeselom/repurpose-ai"
LABEL org.opencontainers.image.description="Production image for RepurposeAI"
LABEL org.opencontainers.image.licenses="MIT"

RUN apk add --no-cache \
    libc6-compat \
    curl \
    tini \
    && addgroup --system --gid 1001 appgroup \
    && adduser --system --uid 1001 appuser \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy Prisma schema and generated client from builder
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy standalone Next.js build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy entrypoint
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create required directories with proper permissions
RUN mkdir -p /app/.next/cache && \
    chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV SENTRY_SUPPRESS_GLOBAL_ERROR_HANDLER_FILE_WARNING=1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

EXPOSE 3000

# Use tini as init for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/docker-entrypoint.sh"]
