import { prisma } from "@/lib/prisma";
import type { ExecutionContext } from "./engine";
import type { CompiledNode } from "./compiler";

export class WorkflowExecutor {
  private context: ExecutionContext;

  constructor(context: ExecutionContext) {
    this.context = context;
  }

  async execute(node: CompiledNode): Promise<unknown> {
    switch (node.type) {
      case "TRIGGER":
        return this.executeTrigger(node);
      case "AI_GENERATE":
      case "AI_REWRITE":
      case "AI_SUMMARIZE":
      case "AI_TRANSLATE":
      case "AI_EXPAND":
      case "AI_SHORTEN":
      case "AI_OPTIMIZE":
      case "AI_TONE_CONVERT":
        return this.executeAINode(node);
      case "CONDITION":
        return this.executeCondition(node);
      case "DELAY":
        return this.executeDelay(node);
      case "LOOP":
        return this.executeLoop(node);
      case "VARIABLE":
        return this.executeVariable(node);
      case "FORMATTER":
        return this.executeFormatter(node);
      case "WEBHOOK":
      case "HTTP_REQUEST":
        return this.executeHttpRequest(node);
      case "EMAIL":
        return this.executeEmail(node);
      case "DATABASE":
        return this.executeDatabase(node);
      case "MERGE":
        return this.executeMerge(node);
      case "SPLIT":
        return this.executeSplit(node);
      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  private async executeTrigger(node: CompiledNode): Promise<{ triggered: boolean; data: Record<string, unknown> }> {
    return {
      triggered: true,
      data: this.context.triggerData ?? {},
    };
  }

  private async executeAINode(node: CompiledNode): Promise<{ content: string; model: string; usage: Record<string, number> }> {
    const input = this.getNodeInput(node.id);
    const prompt = typeof input === "string" ? input : JSON.stringify(input);

    const response = await fetch(`${process.env.AI_BASE_URL || "https://api.morphllm.com/v1"}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AI_API_KEY || ""}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "morph-glm52-744b",
        messages: [{ role: "user", content: node.config?.prompt ? `${node.config.prompt}\n\n${prompt}` : prompt }],
        temperature: node.config?.temperature ?? 0.7,
        max_tokens: node.config?.maxTokens ?? 2048,
      }),
    });

    if (!response.ok) throw new Error(`AI API error: ${response.status}`);
    const data = await response.json();

    return {
      content: data.choices?.[0]?.message?.content || "",
      model: data.model || process.env.AI_MODEL || "",
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  }

  private async executeCondition(node: CompiledNode): Promise<{ condition: boolean; output: unknown }> {
    const input = this.getNodeInput(node.id) as Record<string, unknown> || {};
    const { field, operator, value } = node.config as Record<string, unknown>;
    const actualValue = this.resolveValue(input, field as string);

    let condition = false;
    switch (operator) {
      case "equals": condition = actualValue === value; break;
      case "not_equals": condition = actualValue !== value; break;
      case "contains": condition = String(actualValue).includes(String(value)); break;
      case "greater_than": condition = Number(actualValue) > Number(value); break;
      case "less_than": condition = Number(actualValue) < Number(value); break;
      case "is_empty": condition = !actualValue; break;
      case "is_not_empty": condition = !!actualValue; break;
      default: condition = !!actualValue;
    }

    return { condition, output: input };
  }

  private async executeDelay(node: CompiledNode): Promise<{ delayed: boolean; duration: number }> {
    const duration = (node.config?.duration as number) || 60;
    await new Promise((resolve) => setTimeout(resolve, duration * 1000));
    return { delayed: true, duration };
  }

  private async executeLoop(node: CompiledNode): Promise<{ iterations: number; results: unknown[] }> {
    const count = (node.config?.count as number) || 3;
    const input = this.getNodeInput(node.id);
    const results: unknown[] = [];

    for (let i = 0; i < count; i++) {
      results.push({ iteration: i, input, loopIndex: i });
    }

    return { iterations: count, results };
  }

  private async executeVariable(node: CompiledNode): Promise<{ name: string; value: unknown }> {
    const { operation, name, value } = node.config as Record<string, string>;
    if (operation === "set") {
      this.context.variables[name] = this.resolveTemplate(value);
      return { name, value: this.context.variables[name] };
    }
    return { name, value: this.context.variables[name] };
  }

  private async executeFormatter(node: CompiledNode): Promise<{ formatted: string }> {
    const input = this.getNodeInput(node.id);
    const format = (node.config?.format as string) || "json";
    const inputStr = typeof input === "string" ? input : JSON.stringify(input);

    switch (format) {
      case "uppercase": return { formatted: inputStr.toUpperCase() };
      case "lowercase": return { formatted: inputStr.toLowerCase() };
      case "trim": return { formatted: inputStr.trim() };
      case "json": return { formatted: JSON.stringify(input, null, 2) };
      case "markdown": return { formatted: `\`\`\`\n${inputStr}\n\`\`\`` };
      default: return { formatted: inputStr };
    }
  }

  private async executeHttpRequest(node: CompiledNode): Promise<{ status: number; data: unknown }> {
    const { method, url, headers, body } = node.config as Record<string, any>;
    const response = await fetch(this.resolveTemplate(url), {
      method: (method as string) || "GET",
      headers: headers ? JSON.parse(this.resolveTemplate(JSON.stringify(headers))) : { "Content-Type": "application/json" },
      body: body ? this.resolveTemplate(body) : undefined,
    });
    const data = await response.json().catch(() => response.text());
    return { status: response.status, data };
  }

  private async executeEmail(node: CompiledNode): Promise<{ sent: boolean; to: string }> {
    const { to, subject, body } = node.config as Record<string, string>;
    if (!process.env.RESEND_API_KEY) throw new Error("Email provider not configured");
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "noreply@repurposeai.com",
        to: this.resolveTemplate(to),
        subject: this.resolveTemplate(subject || "Workflow Notification"),
        text: this.resolveTemplate(body || ""),
      }),
    });
    return { sent: true, to };
  }

  private async executeDatabase(node: CompiledNode): Promise<unknown> {
    const { operation, table, data, where } = node.config as Record<string, any>;
    const delegate = (prisma as any)[table];
    switch (operation) {
      case "read":
        return delegate?.findMany?.({ where: where ?? {} }) ?? [];
      case "write":
        return delegate?.create?.({ data: data ?? {} }) ?? null;
      case "update":
        return delegate?.update?.({ where: where ?? {}, data: data ?? {} }) ?? null;
      case "delete":
        return delegate?.delete?.({ where: where ?? {} }) ?? null;
      default:
        throw new Error(`Unknown database operation: ${operation}`);
    }
  }

  private async executeMerge(_node: CompiledNode): Promise<{ merged: boolean }> {
    return { merged: true };
  }

  private async executeSplit(_node: CompiledNode): Promise<{ split: boolean; paths: number }> {
    return { split: true, paths: 2 };
  }

  private getNodeInput(nodeId: string): unknown {
    const edges = Array.from(this.context.nodeResults.keys());
    const parentEdge = edges[edges.length - 1];
    return parentEdge ? this.context.nodeResults.get(parentEdge) : this.context.triggerData;
  }

  private resolveValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split(".").reduce<unknown>((acc, key) => (acc as Record<string, unknown>)?.[key], obj);
  }

  private resolveTemplate(template: string): string {
    return template.replace(/\{\{(.+?)\}\}/g, (_, key) => {
      const trimmed = key.trim();
      const value = this.context.variables[trimmed];
      if (value !== undefined) return String(value);
      const parts = trimmed.split(".");
      let obj: unknown = this.context.nodeResults;
      for (const part of parts) {
        if (obj && typeof obj === "object") obj = (obj as Record<string, unknown>)[part];
        else return "";
      }
      return obj !== undefined ? String(obj) : "";
    });
  }
}
