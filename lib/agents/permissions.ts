import { prisma } from "@/lib/prisma";

export class AgentPermissions {
  static async verify(
    userId: string,
    agent: { organizationId: string; userId: string; visibility: string },
    action: "view" | "run" | "edit" | "delete" | "manage"
  ): Promise<void> {
    const member = await prisma.organizationMembers.findFirst({
      where: { userId, organizationId: agent.organizationId },
    });
    if (!member) throw new Error("Not a member of this organization");

    const role = member.role;

    if (role === "OWNER" || role === "ADMIN") return;
    if (action === "manage") throw new Error("Insufficient permissions");

    if (agent.userId === userId) return;

    if (action === "view" && agent.visibility !== "PRIVATE") return;

    if (agent.visibility === "PUBLIC") return;

    throw new Error("Insufficient permissions");
  }

  static canEdit(role: string): boolean {
    return ["OWNER", "ADMIN", "EDITOR", "MANAGER"].includes(role);
  }

  static canView(role: string): boolean {
    return true;
  }

  static canDelete(role: string): boolean {
    return ["OWNER", "ADMIN"].includes(role);
  }
}
