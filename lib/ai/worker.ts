import { prisma } from "@/lib/prisma";
import { AiJobManager } from "./job";
import { AiQueue } from "./queue";
import { AiCache } from "./cache";
import { moderateContent } from "./moderation";
import { AiMetrics } from "./metrics";
import { generateWithFallback } from "./unified-provider";
import { estimateCost } from "./cost-tracker";
import { CreditManager } from "@/lib/billing/credits";
import type { VoiceProfile, BrandKit } from "@/lib/types/index";
import { buildContentPrompt } from "./prompt-engine";
import type { Tone } from "@/hooks/use-generate";

const CREDIT_COST_PER_GENERATION = 1;

export class AiWorker {
  static async processJob(jobId: string, workerId: string): Promise<void> {
    const job = await prisma.aiJobs.findUnique({ where: { id: jobId } });
    if (!job) throw new Error(`Job ${jobId} not found`);
    if (job.status === "CANCELLED") return;

    const startTime = Date.now();
    const queueWait = Math.round(
      (startTime - (job.createdAt?.getTime() ?? startTime)) / 1000,
    );

    try {
      if (await AiJobManager.shouldCancel(jobId)) {
        await AiJobManager.updateStatus(jobId, "CANCELLED");
        await AiQueue.complete(jobId);
        return;
      }

      const creditCheck = await CreditManager.checkAndDeduct(
        job.userId,
        CREDIT_COST_PER_GENERATION,
        `generation:${jobId}`,
        { generationId: jobId },
      );
      if (!creditCheck.success) {
        await AiJobManager.updateStatus(jobId, "FAILED", {
          error: creditCheck.error,
          progress: 0,
        } as any);
        await AiJobManager.setError(jobId, creditCheck.error ?? "Insufficient credits");
        await AiQueue.fail(jobId, creditCheck.error ?? "Insufficient credits", false);
        return;
      }

      await AiJobManager.updateStatus(jobId, "RUNNING", {
        provider: "morphllm",
        model: process.env.AI_MODEL || "morph-glm52-744b",
      } as any);

      await AiJobManager.updateStep(jobId, "validate", "COMPLETED", "Input validated");
      await AiJobManager.updateStep(jobId, "moderation", "RUNNING", "Running content moderation");

      const moderation = await moderateContent(job.inputContent);
      if (!moderation.passed) {
        await AiJobManager.updateStep(jobId, "moderation", "FAILED", moderation.reason);
        await AiJobManager.setError(jobId, `Content moderation failed: ${moderation.reason}`);
        await AiQueue.fail(jobId, moderation.reason ?? "Content rejected", false);
        return;
      }

      await AiJobManager.updateStep(jobId, "moderation", "COMPLETED", "Content passed moderation");
      await AiJobManager.updateProgress(jobId, 15);

      await AiJobManager.updateStep(jobId, "prompt_assembly", "RUNNING", "Assembling prompt");

      let voice: VoiceProfile | null = null;
      if (job.voiceProfileId) {
        const vp = await prisma.voiceProfiles.findUnique({
          where: { id: job.voiceProfileId },
        });
        if (vp) {
          voice = {
            id: vp.id,
            user_id: vp.userId,
            name: vp.name,
            description: vp.description,
            tone: (vp.tone || "casual") as "formal" | "casual" | "witty" | "authoritative" | "friendly",
            example_posts: vp.examplePosts,
            embedding: null,
            is_default: vp.isDefault,
            is_favorite: vp.isFavorite || false,
            created_at: vp.createdAt.toISOString(),
          };
        }
      }

      let brandKit: BrandKit | null = null;
      if (job.brandKitId) {
        const bk = await prisma.brandKits.findUnique({
          where: { id: job.brandKitId },
        });
        if (bk) {
          brandKit = {
            id: bk.id,
            user_id: bk.userId,
            company_name: bk.companyName,
            company_description: bk.companyDescription ?? "",
            target_audience: bk.targetAudience ?? "",
            brand_colors: bk.brandColors,
            brand_voice: bk.brandVoice,
            logo_url: bk.logoUrl,
            created_at: bk.createdAt.toISOString(),
            updated_at: bk.updatedAt.toISOString(),
          };
        }
      }

      const rawTone = job.metadata && typeof job.metadata === "object" && "tone" in job.metadata
        ? String((job.metadata as Record<string, unknown>).tone)
        : "direct";
      const tone: Tone = rawTone === "thought_leader" || rawTone === "casual" ? rawTone : "direct";

      const prompt = buildContentPrompt({
        extraction: {
          keyPoints: [],
          summary: job.inputContent.slice(0, 500),
          hooks: [],
          topics: [],
        },
        brandKit,
        voiceProfile: voice,
        tone,
        audience: "general",
        format: job.outputFormat as any,
      });

      await AiJobManager.updateStep(jobId, "prompt_assembly", "COMPLETED", "Prompt assembled");
      await AiJobManager.updateProgress(jobId, 30);

      const cacheKey = {
        prompt,
        voice: voice ? JSON.stringify(voice) : null,
        brand: brandKit ? JSON.stringify(brandKit) : null,
        platform: job.outputFormat,
        tone,
      };

      const cached = await AiCache.get(cacheKey);
      if (cached) {
        await CreditManager.addCredits(job.userId, CREDIT_COST_PER_GENERATION, "REFUND", {
          reference: `cache-refund:${jobId}`,
          description: "Refund — cached result used",
        });

        await AiJobManager.updateStep(jobId, "generation", "COMPLETED", "Used cached result");
        await AiJobManager.updateProgress(jobId, 80);

        await AiJobManager.updateStep(jobId, "post_processing", "RUNNING", "Post-processing");
        await AiJobManager.updateStep(jobId, "post_processing", "COMPLETED", "Post-processing done");
        await AiJobManager.updateProgress(jobId, 90);

        await AiJobManager.updateStep(jobId, "store", "RUNNING", "Saving result");
        await AiJobManager.updateStep(jobId, "store", "COMPLETED", "Result saved");
        await AiJobManager.updateProgress(jobId, 100);

        await AiJobManager.setResult(jobId, {
          outputContent: cached,
          provider: "cache",
          model: "cache",
          promptTokens: 0,
          completionTokens: estimateCost(prompt, cached).completionTokens,
          totalTokens: estimateCost(prompt, cached).totalTokens,
          estimatedCost: 0,
          duration: Math.round((Date.now() - startTime) / 1000),
        });

        await AiQueue.complete(jobId);
        return;
      }

      await AiJobManager.updateStep(jobId, "generation", "RUNNING", "Generating content");
      await AiJobManager.updateProgress(jobId, 35);

      const genResult = await generateWithFallback(prompt, {
        temperature: 0.7,
        maxTokens: 2048,
        timeout: 60000,
        retries: 0,
      });

      await AiJobManager.updateStep(jobId, "generation", "COMPLETED", "Content generated");
      await AiJobManager.updateProgress(jobId, 75);

      await AiJobManager.updateStep(jobId, "post_processing", "RUNNING", "Post-processing");
      const processedContent = genResult.content;
      await AiJobManager.updateStep(jobId, "post_processing", "COMPLETED", "Post-processing done");
      await AiJobManager.updateProgress(jobId, 90);

      await AiJobManager.updateStep(jobId, "store", "RUNNING", "Saving result");

      const cost = estimateCost(prompt, processedContent, genResult.provider, genResult.model);

      await AiCache.set(cacheKey, processedContent, {
        model: genResult.model,
        tokensUsed: cost.totalTokens,
      });

      const duration = Math.round((Date.now() - startTime) / 1000);

      await AiJobManager.setResult(jobId, {
        outputContent: processedContent,
        provider: genResult.provider,
        model: genResult.model,
        promptTokens: cost.promptTokens,
        completionTokens: cost.completionTokens,
        totalTokens: cost.totalTokens,
        estimatedCost: cost.estimatedCost,
        duration,
      });

      await AiJobManager.updateStep(jobId, "store", "COMPLETED", "Result saved");
      await AiJobManager.updateStep(jobId, "complete", "COMPLETED", "Generation completed");
      await AiJobManager.updateProgress(jobId, 100);

      await prisma.generations.create({
        data: {
          userId: job.userId,
          content: processedContent,
          inputType: "ai_job",
          inputContent: job.inputContent.slice(0, 500),
          extractedContent: job.inputContent,
          outputFormat: job.outputFormat,
          outputContent: processedContent,
          voiceProfileId: job.voiceProfileId,
          modelUsed: genResult.model,
          isFavorite: false,
        },
      });

      await AiMetrics.recordGeneration(jobId, {
        provider: genResult.provider,
        model: genResult.model,
        duration,
        queueWait,
        promptTokens: cost.promptTokens,
        completionTokens: cost.completionTokens,
        success: true,
        retryCount: job.retryCount,
        cancelled: false,
      });

      await AiQueue.complete(jobId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      const duration = Math.round((Date.now() - startTime) / 1000);

      const shouldRetry = isRetryable(err);

      if (shouldRetry && job.retryCount < job.maxRetries) {
        await AiJobManager.incrementRetry(jobId);
        await AiJobManager.updateStatus(jobId, "RETRYING", {
          error: errorMessage,
        } as any);
        await AiQueue.fail(jobId, errorMessage, true);
      } else {
        await AiJobManager.updateStep(jobId, "generation", "FAILED", errorMessage);
        await AiJobManager.setError(jobId, errorMessage);
        await AiQueue.fail(jobId, errorMessage, false);

        await AiMetrics.recordGeneration(jobId, {
          provider: job.provider,
          model: job.model,
          duration,
          queueWait,
          promptTokens: 0,
          completionTokens: 0,
          success: false,
          retryCount: job.retryCount,
          cancelled: false,
        });
      }
    }
  }

  static async processQueue(workerId: string): Promise<void> {
    const item = await AiQueue.dequeue(workerId);
    if (!item) return;

    try {
      await this.processJob(item.jobId, workerId);
    } catch (err) {
      console.error(`[Worker ${workerId}] Failed to process job ${item.jobId}:`, err);
      await AiQueue.fail(item.jobId, err instanceof Error ? err.message : "Worker error", false);
    }
  }
}

function isRetryable(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("429") || msg.includes("rate limit")) return true;
    if (msg.includes("timeout") || msg.includes("timed out")) return true;
    if (msg.includes("network") || msg.includes("econnrefused") || msg.includes("econnreset")) return true;
    if (msg.includes("500") || msg.includes("502") || msg.includes("503") || msg.includes("504")) return true;
    if (msg.includes("5xx") || msg.includes("5.")) return true;
    if (msg.includes("internal server error")) return true;
    if (msg.includes("service unavailable") || msg.includes("temporarily")) return true;
  }
  return false;
}
