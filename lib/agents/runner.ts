import { prisma } from "@/lib/prisma";
import { AgentPlanner } from "./planner";
import { AgentExecutor } from "./executor";
import { AgentMemory } from "./memory";
import { AgentConversation } from "./conversation";
import { AgentKnowledge } from "./knowledge";
import { AgentHistory } from "./history";

export class AgentRunner {
  private agent: any;
  private context: any;
  private runId: string;

  constructor(agent: any, context: any) {
    this.agent = agent;
    this.context = context;
    this.runId = context.runId;
  }

  async execute(input: Record<string, unknown>): Promise<{ runId: string; output: string }> {
    const run = await this.createRun(input);
    try {
      const plan = await AgentPlanner.createPlan(this.agent, input);
      await AgentMemory.store(this.agent.id, this.runId, this.context, {
        key: `run:${this.runId}`,
        content: JSON.stringify(input),
        type: "SHORT_TERM",
      });

      const result = await AgentExecutor.executePlan(this.agent, plan, this.context);

      await AgentHistory.recordStep(this.runId, { nodeId: "execute", status: "COMPLETED", output: result });

      const rawOutput = result.output ?? result;
      const output = typeof rawOutput === "string" ? rawOutput : JSON.stringify(rawOutput);
      await this.completeRun(run.id, output);

      return { runId: this.runId, output };
    } catch (err: any) {
      await this.failRun(run.id, err.message);
      throw err;
    }
  }

  async executeTask(taskId: string) {
    const task = await prisma.aiAgentTasks.findUnique({ where: { id: taskId } });
    if (!task) throw new Error("Task not found");

    await prisma.aiAgentTasks.update({ where: { id: taskId }, data: { status: "RUNNING", startedAt: new Date() } });

    try {
      const result = await AgentExecutor.executeTool(task.toolType as any, (task.input ?? {}) as Record<string, unknown>, this.context);
      await prisma.aiAgentTasks.update({
        where: { id: taskId },
        data: { status: "COMPLETED", output: result as any, completedAt: new Date(), duration: 0 },
      });
      return result;
    } catch (err: any) {
      await prisma.aiAgentTasks.update({
        where: { id: taskId },
        data: { status: "FAILED", error: err.message, completedAt: new Date() },
      });
      throw err;
    }
  }

  async chat(message: string, conversationId?: string) {
    let conv = conversationId
      ? await AgentConversation.getConversation(conversationId)
      : null;
    if (!conv) {
      conv = await AgentConversation.createConversation(this.agent.id, this.runId, this.context);
    }

    await AgentConversation.addMessage(conv.id, "USER", message);
    const history = await AgentConversation.getHistory(conv.id);

    const memory = await AgentMemory.search(this.agent.id, message, 5);
    const knowledge = await AgentKnowledge.search(this.agent.id, message, this.context, 3);

    const systemPrompt = this.agent.systemPrompt ?? "You are a helpful AI agent.";
    const contextPrompt = this.buildContextPrompt(memory, knowledge);

    const response = await AgentExecutor.executeChat(this.agent, systemPrompt, contextPrompt, history);

    await AgentConversation.addMessage(conv.id, "ASSISTANT", response, { tokens: response.length });

    await AgentMemory.store(this.agent.id, this.runId, this.context, {
      key: `chat:${conv.id}:user:${Date.now()}`,
      content: `USER: ${message}\nASSISTANT: ${response}`,
      type: "CONVERSATION",
    });

    return { conversationId: conv.id, response };
  }

  private buildContextPrompt(memory: any[], knowledge: any[]): string {
    const parts: string[] = [];
    if (memory.length > 0) {
      parts.push("## Relevant Memories\n" + memory.map((m: any) => `- ${m.content}`).join("\n"));
    }
    if (knowledge.length > 0) {
      parts.push("## Knowledge Base\n" + knowledge.map((k: any) => `- ${k.content}`).join("\n"));
    }
    return parts.join("\n\n");
  }

  private async createRun(input: Record<string, unknown>) {
    return prisma.aiAgentRuns.create({
      data: {
        agentId: this.agent.id,
        organizationId: this.context.organizationId,
        userId: this.context.userId,
        status: "RUNNING",
        input: input as any,
        startedAt: new Date(),
      },
    });
  }

  private async completeRun(runId: string, output: unknown) {
    await prisma.aiAgentRuns.update({
      where: { id: runId },
      data: { status: "COMPLETED", output: output as any, completedAt: new Date() },
    });
  }

  private async failRun(runId: string, error: string) {
    await prisma.aiAgentRuns.update({
      where: { id: runId },
      data: { status: "FAILED", error, completedAt: new Date() },
    });
  }
}
