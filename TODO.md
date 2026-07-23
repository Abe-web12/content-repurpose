# TODO - Analytics Phase 8 Stage 4 Part 4 (Final Production Polish)

## Step 1: Inspect Analytics surface (done/observed)
- Inspect lib/analytics/engine.ts
- Inspect Analytics UI components and hooks (overview page, useAnalytics, charts)
- Inspect API routes:
  - app/api/analytics/overview/route.ts
  - app/api/analytics/export/route.ts

## Step 2: Fix Analytics-engine performance & correctness
- Remove organization-wide data leakage (member userIds scope)
- Fix incorrect placeholder/random metrics
- Remove potential N+1 patterns inside analytics engine
- Harden typing and numeric coercion

## Step 3: Redis caching improvements (Analytics-only)
- Ensure cache is resilient when Redis env missing (test/dev)

## Step 4: Update analytics tests
- Ensure analytics tests run without external env (Redis/Playwright)
- Add/adjust mocks so Prisma model accesses don’t crash
- Add coverage for export/forecast/benchmarks/alerts/pagination/org isolation/RBAC

## Step 5: Run verification commands
- npx prisma validate
- npx prisma generate
- npm run lint
- npm run build
- npm test

## Step 6: Return complete modified Analytics-related files only

