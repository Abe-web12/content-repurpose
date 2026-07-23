import { prisma } from "@/lib/prisma";

export class AgentTools {
  static toolHandlers: Record<string, (input: Record<string, unknown>, context: any) => Promise<unknown>> = {};

  static register(type: string, handler: (input: Record<string, unknown>, context: any) => Promise<unknown>) {
    this.toolHandlers[type] = handler;
  }

  static async execute(toolType: string, input: Record<string, unknown>, context: any): Promise<unknown> {
    if (this.toolHandlers[toolType]) {
      return this.toolHandlers[toolType](input, context);
    }

    switch (toolType) {
      case "web_search":
        return this.webSearch(input);
      case "calculator":
        return this.calculator(input);
      case "http_request":
        return this.httpRequest(input);
      case "workflow":
        return this.executeWorkflow(input, context);
      case "current_time":
        return { time: new Date().toISOString() };
      default:
        throw new Error(`Unknown tool type: ${toolType}`);
    }
  }

  static async getAgentTools(agentId: string) {
    return prisma.aiAgentTools.findMany({
      where: { agentId, enabled: true },
    });
  }

  static async addTool(agentId: string, context: { organizationId: string; userId: string }, data: { type: string; name: string; description?: string; config?: Record<string, unknown> }) {
    return prisma.aiAgentTools.create({
      data: {
        agentId,
        organizationId: context.organizationId,
        userId: context.userId,
        type: data.type as any,
        name: data.name,
        description: data.description,
        config: (data.config ?? {}) as any,
      },
    });
  }

  static async removeTool(toolId: string) {
    return prisma.aiAgentTools.delete({ where: { id: toolId } });
  }

  static async updateTool(toolId: string, data: { enabled?: boolean; config?: Record<string, unknown> }) {
    return prisma.aiAgentTools.update({
      where: { id: toolId },
      data: {
        ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
        ...(data.config ? { config: data.config as any } : {}),
      },
    });
  }

  private static async webSearch(input: Record<string, unknown>): Promise<unknown> {
    const query = input.query as string;
    if (!query) throw new Error("Query required for web search");
    return { results: [`Result for: ${query}`], query };
  }

  private static async calculator(input: Record<string, unknown>): Promise<unknown> {
    const expression = input.expression as string;
    if (!expression) throw new Error("Expression required for calculator");
    try {
      const fn = new Function(`return (${expression})`);
      const result = fn();
      return { expression, result };
    } catch {
      throw new Error("Invalid expression");
    }
  }

  private static async httpRequest(input: Record<string, unknown>): Promise<unknown> {
    const url = input.url as string;
    if (!url) throw new Error("URL required for HTTP request");
    return { url, status: 200, body: `Response from ${url}` };
  }

  private static async executeWorkflow(input: Record<string, unknown>, context: any): Promise<unknown> {
    const workflowId = input.workflowId as string;
    if (!workflowId) throw new Error("workflowId required");
    const { WorkflowEngine } = await import("@/lib/workflows/engine");
    return WorkflowEngine.execute(workflowId, {
      organizationId: context.organizationId,
      userId: context.userId,
      triggerType: "agent",
      triggerData: input,
    });
  }
}

AgentTools.register("web_search", AgentTools["webSearch"].bind(AgentTools));
AgentTools.register("calculator", AgentTools["calculator"].bind(AgentTools));
AgentTools.register("http_request", AgentTools["httpRequest"].bind(AgentTools));
AgentTools.register("workflow", AgentTools["executeWorkflow"].bind(AgentTools));
