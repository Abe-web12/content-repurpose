import { prisma } from "@/lib/prisma";
import { WorkflowEngine } from "./engine";

export class WorkflowScheduler {
  static async schedule(workflowId: string, options: {
    organizationId: string;
    userId: string;
    triggerType: string;
    config: Record<string, unknown>;
  }) {
    const existing = await prisma.workflowTriggers.findFirst({
      where: { workflowId, triggerType: options.triggerType as any, enabled: true },
    });

    if (existing) {
      return prisma.workflowTriggers.update({
        where: { id: existing.id },
        data: { config: options.config as any },
      });
    }

    return prisma.workflowTriggers.create({
      data: {
        workflowId,
        triggerType: options.triggerType as any,
        config: options.config as any,
        enabled: true,
      },
    });
  }

  static async unschedule(triggerId: string) {
    return prisma.workflowTriggers.update({
      where: { id: triggerId },
      data: { enabled: false },
    });
  }

  static async getSchedules(workflowId: string) {
    return prisma.workflowTriggers.findMany({
      where: { workflowId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async processDueSchedules() {
    const triggers = await prisma.workflowTriggers.findMany({
      where: { enabled: true },
      include: { workflow: true },
    });

    for (const trigger of triggers) {
      if (trigger.triggerType !== "CRON" && trigger.triggerType !== "SCHEDULED_EVENT") continue;

      const shouldFire = this.evaluateSchedule(trigger.config as Record<string, unknown>);
      if (!shouldFire) continue;

      try {
        await prisma.workflowTriggers.update({
          where: { id: trigger.id },
          data: { lastFiredAt: new Date() },
        });

        const organizationId = trigger.workflow.organizationId;
        const userId = trigger.workflow.createdById;

        await WorkflowEngine.execute(trigger.workflowId, {
          organizationId,
          userId,
          triggerType: trigger.triggerType.toLowerCase(),
          triggerData: { scheduled: true, triggerId: trigger.id },
        });
      } catch { /* log and continue */ }
    }
  }

  static evaluateSchedule(config: Record<string, unknown>): boolean {
    const cron = config.cron as string;
    if (!cron) return false;
    return this.cronMatch(cron);
  }

  static cronMatch(cron: string, date: Date = new Date()): boolean {
    if (cron === "* * * * *") return true;
    const parts = cron.split(" ");
    if (parts.length !== 5) return false;
    const fields = [date.getMinutes(), date.getHours(), date.getDate(), date.getMonth() + 1, date.getDay()];
    for (let i = 0; i < 5; i++) {
      if (parts[i] !== "*" && !parts[i].split(",").includes(String(fields[i]))) return false;
    }
    return true;
  }

  static getNextScheduledRun(cron: string): Date | null {
    const parts = cron.split(" ");
    if (parts.length !== 5) return null;
    const now = new Date();
    let next = new Date(now);
    next.setSeconds(0, 0);

    for (let i = 0; i < 525600; i++) {
      next.setMinutes(next.getMinutes() + 1);
      if (this.cronMatch(cron, next)) return next;
    }
    return null;
  }
}
