#!/bin/sh
set -e

echo "==> RepurposeAI Docker Entrypoint"

# Validate critical environment variables
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set"
  exit 1
fi

if [ -z "$REDIS_URL" ]; then
  echo "ERROR: REDIS_URL is not set"
  exit 1
fi

# Generate Prisma client (ensures the binary matches the runtime)
echo "==> Generating Prisma client..."
npx prisma generate

# Run database migrations if ENABLE_MIGRATIONS is set
if [ "$ENABLE_MIGRATIONS" = "true" ]; then
  echo "==> Running database migrations..."
  npx prisma migrate deploy
fi

# Start the Next.js server
echo "==> Starting application..."
exec node server.js
