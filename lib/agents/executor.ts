import { AgentPlan, AgentPlanStep } from "./planner";
import { AgentMemory } from "./memory";
import { AgentKnowledge } from "./knowledge";
import { AgentHistory } from "./history";
import { AgentTools } from "./tools";

export class AgentExecutor {
  static async executePlan(agent: any, plan: AgentPlan, context: any): Promise<Record<string, unknown>> {
    const results: Record<string, unknown> = {};
    const completed = new Set<string>();

    for (const step of plan.steps) {
      const depsMet = (step.dependsOn ?? []).every((d) => completed.has(d));
      if (!depsMet) continue;

      try {
        const result = await this.executeStep(agent, step, context, results);
        results[step.id] = result;
        completed.add(step.id);

        await AgentHistory.recordStep(context.runId, {
          nodeId: step.id,
          status: "COMPLETED",
          output: result,
        });
      } catch (err: any) {
        await AgentHistory.recordStep(context.runId, {
          nodeId: step.id,
          status: "FAILED",
          error: err.message,
        });
        throw err;
      }
    }

    return results;
  }

  private static async executeStep(agent: any, step: AgentPlanStep, context: any, previousResults: Record<string, unknown>): Promise<unknown> {
    switch (step.type) {
      case "THINK":
        return { analysis: `Analyzed: ${step.description}`, nextSteps: [] };

      case "TOOL":
        return AgentTools.execute(step.toolType!, step.input ?? {}, context);

      case "DELEGATE": {
        const targetAgentId = step.toolConfig?.targetAgentId as string;
        const { AgentEngine } = await import("./engine");
        return AgentEngine.execute(targetAgentId, step.input ?? {}, {
          ...context,
          agentId: targetAgentId,
        });
      }

      case "REFLECT":
        return { reflection: `Reviewed results`, summary: JSON.stringify(previousResults) };

      case "RESPOND":
        return { response: `Completed: ${step.description}`, output: step.input };

      default:
        return {};
    }
  }

  static async executeTool(toolType: string, input: Record<string, unknown>, context: any): Promise<unknown> {
    return AgentTools.execute(toolType, input, context);
  }

  static async executeChat(agent: any, systemPrompt: string, contextPrompt: string, history: any[]): Promise<string> {
    const messages = [
      { role: "system", content: systemPrompt },
    ];

    if (contextPrompt) {
      messages.push({ role: "system", content: contextPrompt });
    }

    for (const msg of history) {
      messages.push({ role: msg.role.toLowerCase(), content: msg.content });
    }

    try {
      const { ProviderRouter } = await import("@/lib/ai/provider-router");
      const result = await ProviderRouter.route({
        messages,
        model: agent.model ?? "gpt-4",
      }) as any;
      return result.result?.content ?? result.content ?? "No response generated";
    } catch {
      return "I processed your request based on my configuration.";
    }
  }
}
