export const runtime = "nodejs"

import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { AppError, sanitizeError, parseBody } from "@/lib/utils/api-errors"
import { rateLimit } from "@/lib/utils/rate-limit"
import { AgentRunner } from "@/lib/agents/runner"
import { AgentRegistry } from "@/lib/agents/registry"
import { AgentPermissions } from "@/lib/agents/permissions"
import { AgentMemory } from "@/lib/agents/memory"
import { runSchema } from "@/lib/validations/agents"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new AppError("Unauthorized", 401)

    const limitResult = await rateLimit(`agents:run:stream:${user.id}`, { windowMs: 60000, maxRequests: 20 })
    if (!limitResult.success) throw new AppError("Too many requests", 429)

    const member = await prisma.organizationMembers.findFirst({ where: { userId: user.id } })
    if (!member) throw new AppError("No organization found", 404)

    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get("agentId")
    if (!agentId) throw new AppError("agentId query parameter is required", 400)

    const body = await parseBody<Record<string, unknown>>(request)
    const parsed = runSchema.parse(body)

    const run = await prisma.aiAgentRuns.create({
      data: {
        agentId,
        organizationId: member.organizationId,
        userId: user.id,
        status: "RUNNING",
        triggerType: "api",
        input: (parsed.input ?? {}) as any,
        startedAt: new Date(),
      },
    })

    const agent = await AgentRegistry.getAgent(agentId, member.organizationId)
    if (!agent) throw new AppError("Agent not found", 404)

    await AgentPermissions.verify(user.id, agent, "run")

    const context = {
      agentId,
      organizationId: member.organizationId,
      userId: user.id,
      runId: run.id,
    }

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "status", status: "initializing", runId: run.id })}\n\n`))

          const runner = new AgentRunner(agent, context)
          await AgentMemory.store(agent.id, run.id, context, {
            key: `run:${run.id}`,
            content: JSON.stringify(parsed.input ?? {}),
            type: "SHORT_TERM",
          })

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "status", status: "running", runId: run.id })}\n\n`))

          const result = await runner.execute((parsed.input ?? {}) as Record<string, unknown>)

          await prisma.aiAgentRuns.update({
            where: { id: run.id },
            data: { status: "COMPLETED", output: result.output, completedAt: new Date() },
          })

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "result", runId: run.id, output: result.output })}\n\n`))
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", runId: run.id })}\n\n`))
        } catch (err) {
          const message = err instanceof Error ? err.message : "Execution failed"
          await prisma.aiAgentRuns.update({
            where: { id: run.id },
            data: { status: "FAILED", error: message, completedAt: new Date() },
          }).catch(() => {})

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", runId: run.id, error: message })}\n\n`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    })
  } catch (err) {
    const { error, status } = sanitizeError(err)
    return new Response(JSON.stringify({ error }), { status, headers: { "Content-Type": "application/json" } })
  }
}
