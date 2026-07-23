import { NextRequest } from "next/server";
import { V1Helper } from "@/lib/dev-platform/v1-helper";
import { ApiLogger } from "@/lib/dev-platform/api-logger";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const ctx = await V1Helper.authenticate(request);
    V1Helper.requireOrg(ctx);

    return V1Helper.withRequestLogging(request, ctx, async () => {
      const { searchParams } = new URL(request.url);
      const pagination = V1Helper.parsePagination(searchParams);
      const path = searchParams.get("path") || undefined;
      const status = searchParams.get("status") ? parseInt(searchParams.get("status")!) : undefined;

      const logs = await ApiLogger.getRequestLogs(ctx.organizationId, {
        limit: pagination.perPage!,
        offset: (pagination.page! - 1) * pagination.perPage!,
        path,
        status,
      });

      return V1Helper.success(V1Helper.paginate(logs, pagination));
    });
  } catch (err) {
    return V1Helper.error(err);
  }
}
