interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  config: any;
  positionX: number;
  positionY: number;
}

interface WorkflowEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class WorkflowValidator {
  static validate(nodes: WorkflowNode[], edges: WorkflowEdge[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (nodes.length === 0) {
      errors.push("Workflow must have at least one node");
      return { valid: false, errors, warnings };
    }

    const nodeIds = new Set(nodes.map((n) => n.id));
    const incomingEdges = new Map<string, number>();
    const outgoingEdges = new Map<string, number>();

    for (const node of nodes) {
      incomingEdges.set(node.id, 0);
      outgoingEdges.set(node.id, 0);
    }

    for (const edge of edges) {
      if (!nodeIds.has(edge.sourceNodeId)) {
        errors.push(`Edge references non-existent source node: ${edge.sourceNodeId}`);
        continue;
      }
      if (!nodeIds.has(edge.targetNodeId)) {
        errors.push(`Edge references non-existent target node: ${edge.targetNodeId}`);
        continue;
      }
      incomingEdges.set(edge.targetNodeId, (incomingEdges.get(edge.targetNodeId) || 0) + 1);
      outgoingEdges.set(edge.sourceNodeId, (outgoingEdges.get(edge.sourceNodeId) || 0) + 1);
    }

    if (edges.length > 0) {
      const triggerNodes = nodes.filter((n) => n.type === "TRIGGER");
      if (triggerNodes.length === 0) warnings.push("No trigger node found");
      if (triggerNodes.length > 1) errors.push("Multiple trigger nodes not supported");

      const disconnectedNodes = nodes.filter((n) => (incomingEdges.get(n.id) || 0) === 0 && (outgoingEdges.get(n.id) || 0) === 0 && n.type !== "TRIGGER");
      for (const n of disconnectedNodes) {
        warnings.push(`Node "${n.label}" is disconnected`);
      }

      const deadEnds = nodes.filter((n) => (outgoingEdges.get(n.id) || 0) === 0 && n.type !== "TRIGGER");
      if (deadEnds.length === 0 && nodes.length > 1) {
        warnings.push("No terminal node found");
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  static validateNodeConfig(node: WorkflowNode): string | null {
    switch (node.type) {
      case "AI_GENERATE":
      case "AI_REWRITE":
        if (!node.config?.format) return "AI node requires a format";
        break;
      case "CONDITION":
        if (!node.config?.field || !node.config?.operator) return "Condition node requires field and operator";
        break;
      case "DELAY":
        if (!node.config?.duration || node.config.duration < 1) return "Delay node requires positive duration";
        break;
      case "LOOP":
        if (!node.config?.count || node.config.count < 1) return "Loop node requires positive count";
        break;
      case "WEBHOOK":
        if (!node.config?.url) return "Webhook node requires URL";
        break;
      case "HTTP_REQUEST":
        if (!node.config?.url) return "HTTP Request node requires URL";
        break;
      case "EMAIL":
        if (!node.config?.to) return "Email node requires recipient";
        break;
      case "DATABASE":
        if (!node.config?.operation) return "Database node requires operation";
        break;
      case "VARIABLE":
        if (!node.config?.name) return "Variable node requires name";
        break;
    }
    return null;
  }
}
