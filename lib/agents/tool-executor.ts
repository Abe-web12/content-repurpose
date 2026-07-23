import { prisma } from "@/lib/prisma";
import type { AgentToolType } from "@prisma/client";

export interface ToolExecutionLog {
  id: string;
  agentId: string;
  runId?: string;
  toolType: string;
  toolName: string;
  input: Record<string, unknown>;
  output: string;
  duration: number;
  success: boolean;
  error?: string;
  createdAt: Date;
}

export class ToolExecutor {
  static async executeAndLog(
    agentId: string,
    toolType: AgentToolType,
    toolName: string,
    input: Record<string, unknown>,
    runId?: string
  ): Promise<{ output: string; duration: number; success: boolean; error?: string }> {
    const start = Date.now();
    try {
      let output = "";

      switch (toolType) {
        case "WEB_SEARCH":
          output = `[Web Search] Simulated search results for: ${JSON.stringify(input)}`;
          break;
        case "CALCULATOR":
          output = `[Calculator] Result: ${JSON.stringify(input)}`;
          break;
        case "HTTP_REQUEST":
          output = `[HTTP] Simulated response for ${JSON.stringify(input)}`;
          break;
        case "WORKFLOW":
          output = `[Workflow] Triggered workflow with: ${JSON.stringify(input)}`;
          break;
        case "EMAIL":
          output = `[Email] Simulated email send to: ${JSON.stringify(input)}`;
          break;
        case "DATABASE":
          output = `[Database] Simulated query result: ${JSON.stringify(input)}`;
          break;
        case "WEBHOOK":
          output = `[Webhook] Simulated webhook call: ${JSON.stringify(input)}`;
          break;
        default:
          output = `[${toolType}] Executed with: ${JSON.stringify(input)}`;
      }

      const duration = Date.now() - start;
      return { output, duration, success: true };
    } catch (err: any) {
      const duration = Date.now() - start;
      return { output: "", duration, success: false, error: err.message };
    }
  }

  static async getExecutionLogs(agentId: string, limit = 50): Promise<ToolExecutionLog[]> {
    const runs = await prisma.aiAgentRuns.findMany({
      where: { agentId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, output: true, createdAt: true, status: true },
    });

    return runs.map((r) => ({
      id: r.id,
      agentId,
      runId: r.id,
      toolType: "HTTP_REQUEST",
      toolName: "agent-run",
      input: {},
      output: r.output?.toString() || "",
      duration: 0,
      success: r.status === "COMPLETED",
      createdAt: r.createdAt,
    }));
  }
}
