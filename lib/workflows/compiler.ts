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

export interface CompiledNode {
  id: string;
  type: string;
  label: string;
  config: Record<string, unknown>;
}

export interface CompiledEdge {
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface CompiledWorkflow {
  entryNode: string | null;
  nodes: Map<string, CompiledNode>;
  adjacency: Map<string, CompiledEdge[]>;
  reverseAdjacency: Map<string, CompiledEdge[]>;
  executionOrder: string[];
}

export class WorkflowCompiler {
  static compile(nodes: WorkflowNode[], edges: WorkflowEdge[]): CompiledWorkflow {
    const nodeMap = new Map<string, CompiledNode>();
    const adjacency = new Map<string, CompiledEdge[]>();
    const reverseAdjacency = new Map<string, CompiledEdge[]>();

    for (const node of nodes) {
      nodeMap.set(node.id, { id: node.id, type: node.type, label: node.label, config: node.config ?? {} });
      adjacency.set(node.id, []);
      reverseAdjacency.set(node.id, []);
    }

    for (const edge of edges) {
      adjacency.get(edge.sourceNodeId)?.push({
        sourceNodeId: edge.sourceNodeId,
        targetNodeId: edge.targetNodeId,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
      });
      reverseAdjacency.get(edge.targetNodeId)?.push({
        sourceNodeId: edge.sourceNodeId,
        targetNodeId: edge.targetNodeId,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
      });
    }

    const entryNode = nodes.find((n) => n.type === "TRIGGER")?.id || nodes[0]?.id || null;
    const executionOrder = this.topologicalSort(nodeMap, adjacency);

    return { entryNode, nodes: nodeMap, adjacency, reverseAdjacency, executionOrder };
  }

  static topologicalSort(
    nodes: Map<string, CompiledNode>,
    adjacency: Map<string, CompiledEdge[]>,
  ): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    function dfs(nodeId: string): boolean {
      if (visiting.has(nodeId)) return false;
      if (visited.has(nodeId)) return true;

      visiting.add(nodeId);
      const edges = adjacency.get(nodeId) || [];

      for (const edge of edges) {
        if (!dfs(edge.targetNodeId)) return false;
      }

      visiting.delete(nodeId);
      visited.add(nodeId);
      order.push(nodeId);
      return true;
    }

    for (const nodeId of nodes.keys()) {
      if (!visited.has(nodeId)) {
        if (!dfs(nodeId)) return [];
      }
    }

    return order;
  }

  static getParallelGroups(
    adjacency: Map<string, CompiledEdge[]>,
    executionOrder: string[],
  ): string[][] {
    const groups: string[][] = [];
    const indegree = new Map<string, number>();

    for (const [nodeId, edges] of adjacency) {
      if (!indegree.has(nodeId)) indegree.set(nodeId, 0);
      for (const edge of edges) {
        indegree.set(edge.targetNodeId, (indegree.get(edge.targetNodeId) || 0) + 1);
      }
    }

    const queue: string[] = [];
    for (const [nodeId, deg] of indegree) {
      if (deg === 0) queue.push(nodeId);
    }

    while (queue.length > 0) {
      groups.push([...queue]);
      const next: string[] = [];
      for (const nodeId of queue) {
        const edges = adjacency.get(nodeId) || [];
        for (const edge of edges) {
          const newDeg = (indegree.get(edge.targetNodeId) || 1) - 1;
          indegree.set(edge.targetNodeId, newDeg);
          if (newDeg === 0) next.push(edge.targetNodeId);
        }
      }
      queue.length = 0;
      queue.push(...next);
    }

    return groups;
  }
}
