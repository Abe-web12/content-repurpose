import { prisma } from "@/lib/prisma";
import { AgentEngine } from "./engine";

export class AgentScheduler {
  static async createSchedule(agentId: string, context: { organizationId: string; userId: string }, data: { cron: string; input?: Record<string, unknown> }) {
    return prisma.aiAgentSchedules.create({
      data: {
        agentId,
        organizationId: context.organizationId,
        userId: context.userId,
        cron: data.cron,
        input: (data.input ?? {}) as any,
      },
    });
  }

  static async updateSchedule(scheduleId: string, data: { cron?: string; enabled?: boolean; input?: Record<string, unknown> }) {
    return prisma.aiAgentSchedules.update({
      where: { id: scheduleId },
      data: {
        ...(data.cron ? { cron: data.cron } : {}),
        ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
        ...(data.input ? { input: data.input as any } : {}),
      },
    });
  }

  static async deleteSchedule(scheduleId: string) {
    return prisma.aiAgentSchedules.delete({ where: { id: scheduleId } });
  }

  static async getSchedules(agentId: string) {
    return prisma.aiAgentSchedules.findMany({
      where: { agentId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async processDueSchedules() {
    const schedules = await prisma.aiAgentSchedules.findMany({
      where: { enabled: true, nextRunAt: { lte: new Date() } },
    });

    for (const schedule of schedules) {
      try {
        const agent = await prisma.aiAgents.findFirst({
          where: { id: schedule.agentId, deletedAt: null },
        });
        if (!agent) continue;

        const run = await prisma.aiAgentRuns.create({
          data: {
            agentId: schedule.agentId,
            organizationId: schedule.organizationId,
            userId: schedule.userId,
            status: "RUNNING",
            triggerType: "scheduled",
            input: (schedule.input ?? {}) as any,
            startedAt: new Date(),
          },
        });

        await AgentEngine.execute(schedule.agentId, (schedule.input ?? {}) as Record<string, unknown>, {
          agentId: schedule.agentId,
          organizationId: schedule.organizationId,
          userId: schedule.userId,
          runId: run.id,
        });

        await prisma.aiAgentSchedules.update({
          where: { id: schedule.id },
          data: { lastFiredAt: new Date() },
        });
      } catch {
        // Log and continue
      }
    }
  }
}
