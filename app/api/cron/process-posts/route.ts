export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { redis } from "@/lib/redis"
import {
  getValidAccessToken,
  publishToSocial,
  acquirePublishLock,
  releasePublishLock,
} from "@/lib/social"
import type { Platform } from "@prisma/client"

const LOCK_TTL_MS = 30_000

function isAuthorized(request: NextRequest): boolean {
  const secret =
    request.headers.get("x-cron-secret") ??
    request.nextUrl.searchParams.get("secret")

  return secret === process.env.CRON_SECRET
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const results: {
    postId: string
    platform: string
    status: "published" | "failed" | "skipped"
    error?: string
  }[] = []

  try {
    const overduePosts = await prisma.scheduledPosts.findMany({
      where: {
        status: "PENDING",
        scheduledAt: { lte: new Date() },
      },
      select: {
        id: true,
        platform: true,
        content: true,
        userId: true,
        retryCount: true,
      },
      orderBy: { scheduledAt: "asc" },
      take: 50,
    })

    for (const post of overduePosts) {
      const locked = await acquirePublishLock(post.id)
      if (!locked) {
        results.push({
          postId: post.id,
          platform: post.platform,
          status: "skipped",
        })
        continue
      }

      try {
        const provider = post.platform.toLowerCase() as "linkedin" | "twitter"
        const tokenInfo = await getValidAccessToken(post.userId, provider)

        if (!tokenInfo) {
          throw new Error(`No connected account for ${provider}`)
        }

        const result = await publishToSocial(
          provider,
          tokenInfo.accessToken,
          post.content
        )

        if (!result.success) {
          throw new Error(result.error || "Publishing failed")
        }

        await prisma.scheduledPosts.update({
          where: { id: post.id },
          data: {
            status: "PUBLISHED",
            publishedAt: new Date(),
            retryCount: 0,
            failureReason: null,
          },
        })

        results.push({
          postId: post.id,
          platform: post.platform,
          status: "published",
        })
      } catch (dispatchError) {
        const message =
          dispatchError instanceof Error
            ? dispatchError.message
            : "Unknown dispatch error"

        const newRetryCount = post.retryCount + 1

        if (newRetryCount >= 3) {
          await prisma.scheduledPosts.update({
            where: { id: post.id },
            data: {
              status: "FAILED",
              failureReason: message,
              retryCount: newRetryCount,
            },
          })
        } else {
          await prisma.scheduledPosts.update({
            where: { id: post.id },
            data: {
              retryCount: newRetryCount,
              failureReason: message,
            },
          })
        }

        results.push({
          postId: post.id,
          platform: post.platform,
          status: "failed",
          error: message,
        })
      } finally {
        await releasePublishLock(post.id)
      }
    }

    return NextResponse.json({
      processed: results.length,
      results,
    })
  } catch (error) {
    console.error("Cron error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
