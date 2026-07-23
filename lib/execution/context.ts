export class ExecutionContext {
  public readonly variables: Map<string, unknown>;
  public readonly nodeOutputs: Map<string, unknown>;
  public readonly triggerData: Record<string, unknown>;
  public readonly userId: string;
  public readonly organizationId: string;
  public readonly workflowId: string;
  public readonly runId: string;

  constructor(params: {
    variables: Record<string, unknown>;
    triggerData: Record<string, unknown>;
    userId: string;
    organizationId: string;
    workflowId: string;
    runId: string;
    nodeOutputs?: Record<string, unknown>;
  }) {
    this.variables = new Map(Object.entries(params.variables));
    this.nodeOutputs = new Map(Object.entries(params.nodeOutputs ?? {}));
    this.triggerData = params.triggerData;
    this.userId = params.userId;
    this.organizationId = params.organizationId;
    this.workflowId = params.workflowId;
    this.runId = params.runId;
  }

  getVariable(name: string): unknown {
    if (this.variables.has(name)) return this.variables.get(name);
    if (name in this.triggerData) return (this.triggerData as Record<string, unknown>)[name];
    return undefined;
  }

  setVariable(name: string, value: unknown): void {
    this.variables.set(name, value);
  }

  getNodeOutput(nodeId: string): unknown {
    return this.nodeOutputs.get(nodeId);
  }

  setNodeOutput(nodeId: string, output: unknown): void {
    this.nodeOutputs.set(nodeId, output);
  }

  resolveTemplate(template: string): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (_match, path) => {
      const trimmed = (path as string).trim();
      const value = this.resolvePath(trimmed);
      if (value === undefined || value === null) return `{{${trimmed}}}`;
      if (typeof value === "object") return JSON.stringify(value);
      return String(value);
    });
  }

  private resolvePath(path: string): unknown {
    const parts = path.split(".");
    const root = parts[0];

    if (root === "trigger") {
      return this.resolveNested(this.triggerData, parts.slice(1));
    }

    if (root === "variable" || root === "variables") {
      const varName = parts[1];
      return this.variables.get(varName);
    }

    if (root === "output" || root === "node") {
      const nodeId = parts[1];
      const output = this.nodeOutputs.get(nodeId);
      return this.resolveNested(output, parts.slice(2));
    }

    return this.getVariable(path);
  }

  private resolveNested(obj: unknown, path: string[]): unknown {
    if (path.length === 0) return obj;
    if (typeof obj !== "object" || obj === null) return undefined;
    const current = (obj as Record<string, unknown>)[path[0]];
    if (current === undefined) return undefined;
    return this.resolveNested(current, path.slice(1));
  }

  toJSON(): Record<string, unknown> {
    return {
      variables: Object.fromEntries(this.variables),
      nodeOutputs: Object.fromEntries(this.nodeOutputs),
      triggerData: this.triggerData,
    };
  }
}
