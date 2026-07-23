import { prisma } from "@/lib/prisma";
import { AgentRunner } from "./runner";
import { AgentMemory } from "./memory";

export type AgentRole = "supervisor" | "reviewer" | "researcher" | "writer" | "worker" | "delegate";

export interface CollaboratorConfig {
  agentId: string;
  role: AgentRole;
  instructions?: string;
}

export interface CollaborationPlan {
  id: string;
  mainAgentId: string;
  collaborators: CollaboratorConfig[];
  task: string;
  context: string;
  status: "pending" | "running" | "completed" | "failed";
  createdAt: Date;
}

export class AgentOrchestrator {
  static async createCollaboration(
    mainAgentId: string,
    task: string,
    context: string,
    collaborators: CollaboratorConfig[]
  ): Promise<CollaborationPlan> {
    const plan: CollaborationPlan = {
      id: crypto.randomUUID(),
      mainAgentId,
      collaborators,
      task,
      context,
      status: "pending",
      createdAt: new Date(),
    };
    return plan;
  }

  static async executeCollaboration(plan: CollaborationPlan): Promise<{
    mainResult: string;
    collaboratorResults: Array<{ agentId: string; role: AgentRole; result: string; error?: string }>;
  }> {
    plan.status = "running";
    const collaboratorResults: Array<{ agentId: string; role: AgentRole; result: string; error?: string }> = [];

    const mainAgent = await prisma.aiAgents.findUnique({ where: { id: plan.mainAgentId } });
    if (!mainAgent) throw new Error("Main agent not found");

    const runner = new AgentRunner(mainAgent, {});

    for (const collab of plan.collaborators) {
      try {
        const result = await runner.execute({
          task: plan.task,
          role: collab.role,
          instructions: collab.instructions || "",
          context: plan.context,
          agentId: collab.agentId,
        });
        collaboratorResults.push({
          agentId: collab.agentId,
          role: collab.role,
          result: result.output || "",
        });
      } catch (err: any) {
        collaboratorResults.push({
          agentId: collab.agentId,
          role: collab.role,
          result: "",
          error: err.message,
        });
      }
    }

    const contextWithResults = [
      plan.context,
      ...collaboratorResults.map(
        (r) => `\n[${r.role.toUpperCase()}]: ${r.result}${r.error ? ` (Error: ${r.error})` : ""}`
      ),
    ].join("\n");

    const mainResult = await runner.execute({
      task: plan.task,
      context: contextWithResults,
      collaboratorResults: collaboratorResults.map((r) => ({
        role: r.role,
        result: r.result,
        error: r.error,
      })),
      agentId: plan.mainAgentId,
    });

    plan.status = "completed";

    return {
      mainResult: mainResult.output || "",
      collaboratorResults,
    };
  }

  static async delegateTask(
    fromAgentId: string,
    toAgentId: string,
    task: string,
    context: string
  ): Promise<string> {
    const agent = await prisma.aiAgents.findUnique({ where: { id: fromAgentId } });
    if (!agent) throw new Error("Agent not found");
    const runner = new AgentRunner(agent, {});
    const result = await runner.execute({
      delegatedTask: task,
      delegatedBy: fromAgentId,
      context,
      role: "delegate",
      agentId: toAgentId,
    });
    return result.output || "";
  }
}
