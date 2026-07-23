import { NextResponse } from "next/server";
import { OpenAPISpec } from "@/lib/dev-platform/openapi";

export const runtime = "nodejs";

export async function GET() {
  const spec = OpenAPISpec.generate();
  return NextResponse.json(spec, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Content-Type": "application/json",
    },
  });
}
