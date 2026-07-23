import { AgentRegistry } from "./registry";
import { AgentRunner } from "./runner";
import { AgentPermissions } from "./permissions";

export interface AgentContext {
  agentId: string;
  organizationId: string;
  userId: string;
  runId: string;
  conversationId?: string;
}

export class AgentEngine {
  static async execute(
    agentId: string,
    input: Record<string, unknown>,
    context: AgentContext
  ) {
    const agent = await AgentRegistry.getAgent(agentId, context.organizationId);
    if (!agent) throw new Error("Agent not found");

    await AgentPermissions.verify(context.userId, agent, "run");

    const runner = new AgentRunner(agent, context);
    return runner.execute(input);
  }

  static async executeTask(
    agentId: string,
    taskId: string,
    context: AgentContext
  ) {
    const agent = await AgentRegistry.getAgent(agentId, context.organizationId);
    if (!agent) throw new Error("Agent not found");

    await AgentPermissions.verify(context.userId, agent, "run");
    const runner = new AgentRunner(agent, context);
    return runner.executeTask(taskId);
  }
}
