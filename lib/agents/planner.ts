export interface AgentPlan {
  steps: AgentPlanStep[];
}

export interface AgentPlanStep {
  id: string;
  type: "THINK" | "TOOL" | "DELEGATE" | "REFLECT" | "RESPOND";
  description: string;
  toolType?: string;
  toolConfig?: Record<string, unknown>;
  input?: Record<string, unknown>;
  dependsOn?: string[];
}

export class AgentPlanner {
  static async createPlan(agent: any, input: Record<string, unknown>): Promise<AgentPlan> {
    const steps: AgentPlanStep[] = [
      {
        id: "think-1",
        type: "THINK",
        description: "Analyze the input and determine next steps",
        input,
      },
      {
        id: "respond-1",
        type: "RESPOND",
        description: "Generate final response",
        dependsOn: ["think-1"],
        input,
      },
    ];

    return { steps };
  }

  static createToolPlan(toolType: string, input: Record<string, unknown>): AgentPlan {
    return {
      steps: [
        {
          id: "tool-1",
          type: "TOOL",
          description: `Execute ${toolType}`,
          toolType,
          toolConfig: {},
          input,
        },
      ],
    };
  }

  static createDelegationPlan(taskDescription: string, targetAgentId: string, input: Record<string, unknown>): AgentPlan {
    return {
      steps: [
        {
          id: "delegate-1",
          type: "DELEGATE",
          description: taskDescription,
          toolType: "delegate",
          toolConfig: { targetAgentId },
          input,
        },
        {
          id: "reflect-1",
          type: "REFLECT",
          description: "Review delegated result",
          dependsOn: ["delegate-1"],
        },
      ],
    };
  }
}
