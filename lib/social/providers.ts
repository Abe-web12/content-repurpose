import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

export type SocialProvider = "linkedin" | "twitter";

export interface PublishResult {
  success: boolean;
  postId?: string;
  error?: string;
}

const LOCK_TTL_SECONDS = 30;

export async function acquirePublishLock(postId: string): Promise<boolean> {
  const lockKey = `publish:lock:${postId}`;
  const acquired = await redis.set(lockKey, "1", {
    nx: true,
    ex: LOCK_TTL_SECONDS,
  });
  return acquired === "OK";
}

export async function releasePublishLock(postId: string): Promise<void> {
  await redis.del(`publish:lock:${postId}`);
}

export async function getValidAccessToken(
  userId: string,
  provider: SocialProvider
): Promise<{ accessToken: string; accountId: string } | null> {
  const account = await prisma.socialAccounts.findFirst({
    where: { userId, provider },
  });

  if (!account) return null;

  if (account.expiresAt && new Date() >= account.expiresAt) {
    if (account.refreshToken) {
      try {
        let tokenData: { access_token: string; expires_in: number; refresh_token?: string };
        if (provider === "linkedin") {
          const { refreshAccessToken } = await import("./linkedin");
          tokenData = await refreshAccessToken(account.refreshToken);
        } else {
          const { refreshAccessToken } = await import("./twitter");
          tokenData = await refreshAccessToken(account.refreshToken);
        }

        const updated = await prisma.socialAccounts.update({
          where: { id: account.id },
          data: {
            accessToken: tokenData.access_token,
            expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
            refreshToken: tokenData.refresh_token || account.refreshToken,
          },
        });
        return { accessToken: updated.accessToken, accountId: updated.id };
      } catch {
        return null;
      }
    }
    return null;
  }

  return { accessToken: account.accessToken, accountId: account.id };
}

export async function publishToSocial(
  provider: SocialProvider,
  accessToken: string,
  content: string
): Promise<PublishResult> {
  try {
    if (provider === "linkedin") {
      const { getProfile, createPost } = await import("./linkedin");
      const profile = await getProfile(accessToken);
      const result = await createPost(accessToken, profile.sub, content);
      return { success: true, postId: result.id };
    } else if (provider === "twitter") {
      const { createTweet } = await import("./twitter");
      const result = await createTweet(accessToken, content);
      return { success: true, postId: result.data.id };
    }
    return { success: false, error: `Unknown provider: ${provider}` };
  } catch (err: any) {
    return { success: false, error: err.message || "Publishing failed" };
  }
}
