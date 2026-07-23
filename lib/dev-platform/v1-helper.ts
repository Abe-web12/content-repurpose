import { NextRequest, NextResponse } from "next/server";
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { V1RateLimiter } from "./rate-limiter";
import { ApiLogger } from "./api-logger";

const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000;

interface PaginationParams {
  page: number;
  perPage: number;
  cursor?: string;
  limit?: number;
}

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total?: number;
    page?: number;
    perPage?: number;
    hasMore: boolean;
    cursor?: string;
    nextCursor?: string;
  };
}

interface V1Context {
  userId: string;
  organizationId?: string;
  apiKeyId?: string;
  orgPlan?: string;
  isAuthenticated: boolean;
  authType: "session" | "api_key" | "none";
  requestId: string;
  idempotencyKey?: string;
}

export class V1Helper {
  static parsePagination(searchParams: URLSearchParams): PaginationParams {
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = Math.min(parseInt(searchParams.get("per_page") || "20"), 100);
    const cursor = searchParams.get("cursor") || undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(parseInt(limitParam), 100) : undefined;
    return { page, perPage, cursor, limit };
  }

  static paginate<T>(items: T[], params: PaginationParams, total?: number): PaginatedResult<T> {
    const perPage = params.perPage || 20;
    const hasMore = items.length > perPage;

    if (hasMore) items = items.slice(0, perPage);

    const result: PaginatedResult<T> = {
      data: items,
      pagination: {
        hasMore,
        page: params.page,
        perPage,
      },
    };

    if (total !== undefined) result.pagination.total = total;

    if (params.cursor && items.length > 0) {
      const lastItem = items[items.length - 1] as any;
      result.pagination.nextCursor = lastItem?.id || lastItem?.createdAt;
    }

    return result;
  }

  static cursorPaginate<T extends { id: string }>(
    items: T[],
    limit: number
  ): PaginatedResult<T> {
    const hasMore = items.length > limit;
    if (hasMore) items = items.slice(0, limit);

    return {
      data: items,
      pagination: {
        hasMore,
        nextCursor: hasMore && items.length > 0 ? items[items.length - 1].id : undefined,
      },
    };
  }

  static async authenticate(request: NextRequest): Promise<V1Context> {
    const requestId = request.headers.get("X-Request-Id") || randomUUID();
    const idempotencyKey = request.headers.get("Idempotency-Key") || undefined;
    const authHeader = request.headers.get("Authorization") || "";

    if (authHeader.startsWith("Bearer ")) {
      const apiKey = authHeader.slice(7);
      const { ApiKeyManager } = await import("@/lib/security");
      const result = await ApiKeyManager.validate(apiKey);

      if (result.valid && result.apiKey) {
        const organizationId = result.apiKey.organizationId;
        const org = await prisma.organizations.findUnique({
          where: { id: organizationId },
          select: { plan: true },
        });

        return {
          userId: result.apiKey.userId,
          organizationId,
          apiKeyId: result.apiKey.id,
          orgPlan: org?.plan || "free",
          isAuthenticated: true,
          authType: "api_key",
          requestId,
          idempotencyKey,
        };
      }
    }

    const { userId: clerkUserId } = await auth();

    if (clerkUserId) {
      const membership = await prisma.organizationMembers.findFirst({
        where: { userId: clerkUserId },
        select: { organization: { select: { id: true, plan: true } } },
      });

      return {
        userId: clerkUserId,
        organizationId: membership?.organization.id,
        orgPlan: membership?.organization.plan || "free",
        isAuthenticated: true,
        authType: "session",
        requestId,
        idempotencyKey,
      };
    }

    return {
      userId: "",
      isAuthenticated: false,
      authType: "none",
      requestId,
      idempotencyKey,
    };
  }

  static requireAuth(ctx: V1Context): asserts ctx is V1Context & { userId: string } {
    if (!ctx.isAuthenticated || !ctx.userId) {
      throw new AppError("Authentication required. Provide a valid API key or session.", 401);
    }
  }

  static requireOrg(ctx: V1Context): asserts ctx is V1Context & { organizationId: string } {
    this.requireAuth(ctx);
    if (!ctx.organizationId) {
      throw new AppError("Organization required", 400);
    }
  }

  static async withRequestLogging<T>(
    request: NextRequest,
    ctx: V1Context,
    handler: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await handler();
      const duration = Date.now() - startTime;
      const pathname = new URL(request.url).pathname;

      ApiLogger.log({
        organizationId: ctx.organizationId,
        apiKeyId: ctx.apiKeyId,
        userId: ctx.userId || undefined,
        method: request.method,
        path: pathname,
        status: 200,
        duration,
        ipAddress: request.headers.get("x-forwarded-for") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
        requestId: ctx.requestId,
        idempotencyKey: ctx.idempotencyKey,
      }).catch(() => {});

      if (ctx.apiKeyId) {
        V1RateLimiter.incrementQuota(ctx.apiKeyId).catch(() => {});
      }

      return result;
    } catch (err) {
      const duration = Date.now() - startTime;
      const status = err instanceof AppError ? err.statusCode : 500;

      ApiLogger.log({
        organizationId: ctx.organizationId,
        apiKeyId: ctx.apiKeyId,
        userId: ctx.userId || undefined,
        method: request.method,
        path: new URL(request.url).pathname,
        status,
        duration,
        ipAddress: request.headers.get("x-forwarded-for") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
        requestId: ctx.requestId,
        idempotencyKey: ctx.idempotencyKey,
        error: err instanceof Error ? err.message : String(err),
      }).catch(() => {});

      throw err;
    }
  }

  static success<T>(data: T, status = 200, extra?: Record<string, unknown>) {
    return NextResponse.json({ data, ...extra }, { status });
  }

  static error(err: unknown) {
    const { error, status } = sanitizeError(err);
    return NextResponse.json({ error }, { status });
  }

  static async withRateLimit(ctx: V1Context, path?: string): Promise<void> {
    const result = await V1RateLimiter.check(
      ctx.apiKeyId || ctx.userId,
      {
        path,
        orgPlan: ctx.orgPlan,
        apiKeyId: ctx.apiKeyId,
        orgId: ctx.organizationId,
      }
    );

    if (!result.allowed) {
      throw new AppError(
        `Rate limit exceeded. Reset at ${new Date(result.resetAt).toISOString()}. Retry after ${result.retryAfter}ms.`,
        429
      );
    }
  }
}
