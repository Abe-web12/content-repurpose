import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import {
  welcomeEmailHtml,
  usageWarningHtml,
  paymentReceiptHtml,
  paymentFailedHtml,
  creditWarningHtml,
  upgradeSuggestionHtml,
  expiringSubscriptionHtml,
  churnPreventionHtml,
} from "./templates";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@repurposeai.com";

let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  retries = 2
): Promise<boolean> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resend = getResend();
      await resend.emails.send({
        from: FROM_EMAIL,
        to,
        subject,
        html,
      });
      return true;
    } catch (err: any) {
      console.error(`[email] Failed to send "${subject}" to ${to} (attempt ${attempt + 1}):`, err.message);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }
  return false;
}

export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
  return sendEmail(email, "Welcome to RepurposeAI!", welcomeEmailHtml(name));
}

export async function sendUsageWarning(
  email: string,
  name: string,
  used: number,
  limit: number
): Promise<boolean> {
  const percentage = Math.round((used / limit) * 100);
  return sendEmail(
    email,
    percentage >= 100
      ? "You've reached your generation limit"
      : `You've used ${percentage}% of your monthly generations`,
    usageWarningHtml(name, used, limit, percentage)
  );
}

export async function sendPaymentReceipt(
  email: string,
  name: string,
  amount: number,
  currency: string,
  date: string,
  invoiceUrl?: string | null
): Promise<boolean> {
  return sendEmail(
    email,
    "Payment received — RepurposeAI",
    paymentReceiptHtml(name, amount, currency, date, invoiceUrl || null)
  );
}

export async function sendPaymentFailed(
  email: string,
  name: string,
  amount: number,
  currency: string,
  date: string
): Promise<boolean> {
  return sendEmail(
    email,
    "Payment failed — RepurposeAI",
    paymentFailedHtml(name, amount, currency, date)
  );
}

export async function sendCreditWarning(email: string, name: string, balance: number, daysUntilExpiry: number | null): Promise<boolean> {
  return sendEmail(
    email,
    balance < 10 ? "Low credit balance — RepurposeAI" : "Credits running low — RepurposeAI",
    creditWarningHtml(name, balance, daysUntilExpiry),
  );
}

export async function sendUpgradeSuggestion(email: string, name: string, currentPlan: string, suggestedPlan: string, reason: string): Promise<boolean> {
  return sendEmail(
    email,
    `You're outgrowing ${currentPlan} — upgrade to ${suggestedPlan}`,
    upgradeSuggestionHtml(name, currentPlan, suggestedPlan, reason),
  );
}

export async function sendExpiringSubscription(email: string, name: string, plan: string, daysLeft: number): Promise<boolean> {
  return sendEmail(
    email,
    `Your ${plan} plan renews in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
    expiringSubscriptionHtml(name, plan, daysLeft),
  );
}

export async function sendChurnPrevention(email: string, name: string, plan: string, daysSinceLastUse: number): Promise<boolean> {
  return sendEmail(
    email,
    "We miss you — come back to RepurposeAI",
    churnPreventionHtml(name, plan, daysSinceLastUse),
  );
}

export async function checkAndSendUsageAlerts(): Promise<{ sent: number; errors: string[] }> {
  const errors: string[] = [];
  let sent = 0;

  try {
    const users = await prisma.users.findMany({
      where: {
        generationsLimit: { not: -1 },
        notifyOnBilling: true,
        onboardingCompleted: true,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        generationsUsed: true,
        generationsLimit: true,
        lastUsageAlertSent: true,
      },
    });

    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);

    for (const user of users) {
      const percentage = Math.round((user.generationsUsed / user.generationsLimit) * 100);

      if (percentage < 80) continue;

      const thresholds = percentage >= 100 ? "100" : "80";
      const lastSent = user.lastUsageAlertSent || "";

      if (lastSent === `${todayKey}:${thresholds}`) continue;

      const name = user.fullName || user.email.split("@")[0];
      const ok = await sendUsageWarning(user.email, name, user.generationsUsed, user.generationsLimit);

      if (ok) {
        await prisma.users.update({
          where: { id: user.id },
          data: { lastUsageAlertSent: `${todayKey}:${thresholds}` },
        });
        sent++;
      } else {
        errors.push(`Failed to send alert to ${user.email}`);
      }
    }
  } catch (err: any) {
    errors.push(err.message || "Usage alert check failed");
  }

  return { sent, errors };
}
