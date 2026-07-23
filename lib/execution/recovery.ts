import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { ExecutionEngine } from "./engine";

const RECOVERY_LOCK_KEY = "exec:recovery:lock";
const RECOVERY_LOCK_TTL = 60;

export class ExecutionRecovery {
  static async recoverInterruptedRuns(): Promise<number> {
    const locked = await redis.set(RECOVERY_LOCK_KEY, "1", {
      nx: true,
      ex: RECOVERY_LOCK_TTL,
    });
    if (locked !== "OK") return 0;

    try {
      const staleRuns = await prisma.workflowRuns.findMany({
        where: {
          status: "RUNNING",
          startedAt: {
            lte: new Date(Date.now() - 300000),
          },
        },
        take: 50,
      });

      let recovered = 0;

      for (const run of staleRuns) {
        try {
          const workflow = await prisma.workflows.findFirst({
            where: { id: run.workflowId, deletedAt: null },
          });
          if (!workflow) {
            await this.markRunFailed(run.id, "Workflow deleted during execution");
            recovered++;
            continue;
          }

          const runningSteps = await prisma.workflowRunSteps.findMany({
            where: { runId: run.id, status: "RUNNING" },
          });

          for (const step of runningSteps) {
            const stepAge = step.startedAt
              ? Date.now() - step.startedAt.getTime()
              : Infinity;
            if (stepAge > 120000) {
              await prisma.workflowRunSteps.update({
                where: { id: step.id },
                data: {
                  status: "FAILED",
                  error: "Step timed out during recovery",
                  completedAt: new Date(),
                },
              });
            }
          }

          const completedSteps = await prisma.workflowRunSteps.count({
            where: { runId: run.id, status: "COMPLETED" },
          });

          const totalNodes = await prisma.workflowNodes.count({
            where: { workflowId: run.workflowId, deletedAt: null },
          });

          if (completedSteps >= totalNodes - 1) {
            await prisma.workflowRuns.update({
              where: { id: run.id },
              data: {
                status: "COMPLETED",
                completedAt: new Date(),
                duration: Math.round(
                  (Date.now() - (run.startedAt?.getTime() ?? Date.now())) / 1000,
                ),
              },
            });
          } else {
            await prisma.workflowRuns.update({
              where: { id: run.id },
              data: {
                status: "FAILED",
                error: "Execution interrupted - manual retry required",
                completedAt: new Date(),
              },
            });
          }

          recovered++;
        } catch {
          try {
            await this.markRunFailed(run.id, "Recovery failed");
          } catch {
            // Skip this run
          }
          recovered++;
        }
      }

      return recovered;
    } finally {
      await redis.del(RECOVERY_LOCK_KEY);
    }
  }

  static async recoverStaleLocks(): Promise<number> {
    const lockKeys = await redis.keys("exec:lock:*");
    let recovered = 0;

    for (const key of lockKeys) {
      const ttl = await redis.ttl(key);
      if (ttl < 0) {
        await redis.del(key);
        recovered++;
      }
    }

    return recovered;
  }

  static async getStuckRuns(): Promise<Array<{ id: string; workflowId: string; startedAt: Date | null }>> {
    return prisma.workflowRuns.findMany({
      where: {
        status: "RUNNING",
        startedAt: {
          lte: new Date(Date.now() - 300000),
        },
      },
      select: { id: true, workflowId: true, startedAt: true },
      take: 100,
    });
  }

  private static async markRunFailed(runId: string, error: string): Promise<void> {
    await prisma.workflowRuns.update({
      where: { id: runId },
      data: {
        status: "FAILED",
        error,
        completedAt: new Date(),
      },
    });

    await prisma.workflowRunSteps.updateMany({
      where: { runId, status: { in: ["WAITING", "RUNNING"] } },
      data: {
        status: "FAILED",
        error,
        completedAt: new Date(),
      },
    });
  }

  static async getRecoveryStatus(): Promise<{
    staleRuns: number;
    staleLocks: number;
  }> {
    const staleRuns = await prisma.workflowRuns.count({
      where: {
        status: "RUNNING",
        startedAt: {
          lte: new Date(Date.now() - 300000),
        },
      },
    });

    const lockKeys = await redis.keys("exec:lock:*");
    let staleLocks = 0;
    for (const key of lockKeys) {
      const ttl = await redis.ttl(key);
      if (ttl < 0) staleLocks++;
    }

    return { staleRuns, staleLocks };
  }
}
