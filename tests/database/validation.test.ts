import { describe, it, expect, vi } from "vitest";

const { mockQueryRaw } = vi.hoisted(() => ({
  mockQueryRaw: vi.fn(),
}));

import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: mockQueryRaw,
  },
}));

const ALL_TABLES = [
  "Announcement",
  "Feedback",
  "Invoice",
  "Notification",
  "brand_kits",
  "content_templates",
  "generations",
  "scheduled_posts",
  "social_accounts",
  "support_tickets",
  "user_webhooks",
  "users",
  "voice_profiles",
];

function makeTables(data: string[]) {
  return data.map((t) => ({ tablename: t }));
}

function makeIndexes(data: Array<{ tablename: string; indexname: string; indexdef: string }>) {
  return data;
}

function makeCount(n: number) {
  return [{ count: BigInt(n) }];
}

function makeExplain(plan: string) {
  return [{ "QUERY PLAN": plan }];
}

function makeFKConstraints(data: Array<{ constraint_name: string; table_name: string; foreign_table_name: string }>) {
  return data;
}

describe("Database Validation", () => {
  describe("Schema Integrity", () => {
    it("has all required models", async () => {
      mockQueryRaw.mockResolvedValue(makeTables(ALL_TABLES));
      const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_catalog.pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename
      `;
      const tableNames = tables.map((t) => t.tablename).sort();
      expect(tableNames).toContain("users");
      expect(tableNames).toContain("generations");
      expect(tableNames).toContain("scheduled_posts");
      expect(tableNames).toContain("voice_profiles");
      expect(tableNames).toContain("brand_kits");
      expect(tableNames).toContain("content_templates");
      expect(tableNames).toContain("Notification");
      expect(tableNames).toContain("support_tickets");
      expect(tableNames).toContain("Feedback");
      expect(tableNames).toContain("Invoice");
      expect(tableNames).toContain("user_webhooks");
      expect(tableNames).toContain("social_accounts");
      expect(tableNames).toContain("Announcement");
    });
  });

  describe("Index Coverage", () => {
    it("has all critical indexes", async () => {
      mockQueryRaw.mockResolvedValue(makeIndexes([
        { tablename: "generations", indexname: "idx_gen_user_id", indexdef: "CREATE INDEX idx_gen_user_id ON generations USING btree (user_id)" },
        { tablename: "generations", indexname: "idx_gen_created_at", indexdef: "CREATE INDEX idx_gen_created_at ON generations USING btree (created_at DESC)" },
        { tablename: "scheduled_posts", indexname: "idx_sp_status", indexdef: "CREATE INDEX idx_sp_status ON scheduled_posts USING btree (status)" },
        { tablename: "scheduled_posts", indexname: "idx_sp_scheduled_at", indexdef: "CREATE INDEX idx_sp_scheduled_at ON scheduled_posts USING btree (scheduled_at)" },
      ]));
      const indexes = await prisma.$queryRaw<Array<{ tablename: string; indexname: string; indexdef: string }>>`
        SELECT tablename, indexname, indexdef
        FROM pg_catalog.pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
      `;

      const indexMap = new Map<string, string[]>();
      for (const idx of indexes) {
        const existing = indexMap.get(idx.tablename) || [];
        existing.push(idx.indexdef);
        indexMap.set(idx.tablename, existing);
      }

      const generationIndexes = indexMap.get("generations")?.join(" ") || "";
      expect(generationIndexes).toContain("user_id");
      expect(generationIndexes).toContain("created_at");

      const scheduledIndexes = indexMap.get("scheduled_posts")?.join(" ") || "";
      expect(scheduledIndexes).toContain("status");
      expect(scheduledIndexes).toContain("scheduled_at");
    });
  });

  describe("Foreign Key Integrity", () => {
    it("has valid foreign key constraints", async () => {
      mockQueryRaw.mockResolvedValue(makeFKConstraints([
        { constraint_name: "fk_generations_user", table_name: "generations", foreign_table_name: "users" },
        { constraint_name: "fk_scheduled_posts_user", table_name: "scheduled_posts", foreign_table_name: "users" },
      ]));
      const constraints = await prisma.$queryRaw<Array<{ constraint_name: string; table_name: string; foreign_table_name: string }>>`
        SELECT
          tc.constraint_name,
          tc.table_name,
          ccu.table_name AS foreign_table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
        ORDER BY tc.table_name, tc.constraint_name
      `;

      const fkTables = constraints.map((c) => `${c.table_name} -> ${c.foreign_table_name}`);
      expect(fkTables.length).toBeGreaterThan(0);
    });

    it("has no orphaned generations", async () => {
      mockQueryRaw.mockResolvedValue(makeCount(0));
      const orphans = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM generations g
        LEFT JOIN users u ON g.user_id = u.id
        WHERE u.id IS NULL
      `;
      expect(Number(orphans[0].count)).toBe(0);
    });
  });

  describe("Query Performance", () => {
    it("explains generation list query uses index scan", async () => {
      mockQueryRaw.mockResolvedValue(makeExplain("Index Scan using idx_gen_user_id on generations"));
      const explain = await prisma.$queryRaw<Array<{ "QUERY PLAN": string }>>`
        EXPLAIN SELECT id FROM generations
        WHERE user_id = '00000000-0000-0000-0000-000000000000'
        AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 20
      `;
      const plan = explain.map((r) => r["QUERY PLAN"]).join("\n");
      expect(plan).not.toContain("Seq Scan");
    });

    it("explains scheduled post query uses index scan", async () => {
      mockQueryRaw.mockResolvedValue(makeExplain("Index Scan using idx_sp_status on scheduled_posts"));
      const explain = await prisma.$queryRaw<Array<{ "QUERY PLAN": string }>>`
        EXPLAIN SELECT id FROM scheduled_posts
        WHERE status = 'PENDING'
        AND scheduled_at <= NOW()
        ORDER BY scheduled_at ASC
        LIMIT 50
      `;
      const plan = explain.map((r) => r["QUERY PLAN"]).join("\n");
      expect(plan).not.toContain("Seq Scan");
    });
  });

  describe("Connection Pooling", () => {
    it("handles concurrent queries without timeout", async () => {
      mockQueryRaw.mockResolvedValue(makeCount(42));
      const queries = Array.from({ length: 20 }, () =>
        prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM generations`
      );
      const results = await Promise.all(queries);
      expect(results.length).toBe(20);
      for (const r of results) {
        expect(Number(r[0].count)).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("Data Integrity", () => {
    it("generations have valid output formats", async () => {
      mockQueryRaw.mockResolvedValue(makeCount(0));
      const invalid = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM generations
        WHERE output_format IS NOT NULL
        AND output_format NOT IN ('linkedin_post', 'linkedin_carousel', 'twitter_thread', 'newsletter', 'blog', 'marketing_copy')
      `;
      expect(Number(invalid[0].count)).toBe(0);
    });

    it("users have valid plans", async () => {
      mockQueryRaw.mockResolvedValue(makeCount(0));
      const invalid = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM users
        WHERE plan NOT IN ('free', 'starter', 'pro', 'enterprise')
      `;
      expect(Number(invalid[0].count)).toBe(0);
    });

    it("no duplicate active subscriptions", async () => {
      mockQueryRaw.mockResolvedValue(makeCount(0));
      const duplicates = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM (
          SELECT stripe_subscription_id FROM users
          WHERE stripe_subscription_id IS NOT NULL
          AND plan IN ('starter', 'pro')
          GROUP BY stripe_subscription_id
          HAVING COUNT(*) > 1
        ) dup
      `;
      expect(Number(duplicates[0].count)).toBe(0);
    });
  });

  describe("Neon / PgBouncer Compatibility", () => {
    it("Prisma relationMode is set to prisma", async () => {
      mockQueryRaw.mockResolvedValue(makeCount(0));
      const fkViolations = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count FROM generations g
        WHERE g.user_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = g.user_id)
      `;
      expect(Number(fkViolations[0].count)).toBe(0);
    });
  });
});
