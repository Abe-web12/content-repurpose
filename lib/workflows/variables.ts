import { prisma } from "@/lib/prisma";

export class WorkflowVariables {
  static async get(workflowId: string, name: string): Promise<string | null> {
    const variable = await prisma.workflowVariables.findUnique({
      where: { workflowId_name: { workflowId, name } },
    });
    return variable?.value ?? null;
  }

  static async set(workflowId: string, name: string, value: string, isSecret = false) {
    return prisma.workflowVariables.upsert({
      where: { workflowId_name: { workflowId, name } },
      create: { workflowId, name, value, isSecret },
      update: { value, isSecret },
    });
  }

  static async list(workflowId: string) {
    return prisma.workflowVariables.findMany({
      where: { workflowId },
      orderBy: { name: "asc" },
    });
  }

  static async delete(workflowId: string, name: string) {
    return prisma.workflowVariables.delete({
      where: { workflowId_name: { workflowId, name } },
    });
  }

  static async getOrganizationVars(organizationId: string) {
    return prisma.workflowVariables.findMany({
      where: { organizationId, scope: "organization" },
    });
  }

  static interpolate(template: string, variables: Record<string, unknown>): string {
    return template.replace(/\{\{(.+?)\}\}/g, (_, key) => {
      const value = variables[key.trim()];
      if (value === undefined) return "";
      if (typeof value === "object") return JSON.stringify(value);
      return String(value);
    });
  }

  static extractVariableRefs(template: string): string[] {
    const refs = new Set<string>();
    const regex = /\{\{(.+?)\}\}/g;
    let match;
    while ((match = regex.exec(template)) !== null) {
      refs.add(match[1].trim());
    }
    return Array.from(refs);
  }
}
