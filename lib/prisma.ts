import { PrismaClient } from "@prisma/client"
import { encrypt, decrypt } from "@/lib/utils/encryption"

const SENSITIVE_FIELDS: Record<string, string[]> = {
  OauthConnections: ["accessToken", "refreshToken", "idToken"],
  SocialAccounts: ["accessToken", "refreshToken"],
  SsoProviders: ["clientSecret"],
  AiProviders: ["apiKey"],
  UserWebhooks: ["secret"],
  WebhookEndpoints: ["secret"],
}

function encryptSensitiveFields(model: string, args: any): any {
  const fields = SENSITIVE_FIELDS[model]
  if (!fields) return args
  const data = args.data
  if (!data) return args
  for (const field of fields) {
    if (typeof data[field] === "string" && !data[field].startsWith("enc:")) {
      data[field] = "enc:" + encrypt(data[field])
    }
  }
  return args
}

function decryptSensitiveFields(model: string, result: any): any {
  if (!result) return result
  const fields = SENSITIVE_FIELDS[model]
  if (!fields) return result
  const decryptResults = (obj: any) => {
    if (!obj || typeof obj !== "object") return
    for (const field of fields) {
      if (typeof obj[field] === "string" && obj[field].startsWith("enc:")) {
        try {
          obj[field] = decrypt(obj[field].slice(4))
        } catch {
        }
      }
    }
  }
  if (Array.isArray(result)) {
    for (const item of result) decryptResults(item)
  } else {
    decryptResults(result)
  }
  return result
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

prisma.$use(async (params, next) => {
  const model = params.model as string

  if (SENSITIVE_FIELDS[model]) {
    if (params.action === "create" || params.action === "update" || params.action === "upsert") {
      params.args = encryptSensitiveFields(model, params.args)
    }
  }

  const result = await next(params)

  if (SENSITIVE_FIELDS[model]) {
    if (params.action === "findUnique" || params.action === "findMany" || params.action === "findFirst" || params.action === "findFirstOrThrow" || params.action === "findUniqueOrThrow" || params.action === "create" || params.action === "update" || params.action === "upsert") {
      return decryptSensitiveFields(model, result)
    }
  }

  return result
})

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
