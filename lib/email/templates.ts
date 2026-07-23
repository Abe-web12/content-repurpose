export function welcomeEmailHtml(name: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden">
        <tr><td style="padding:40px 32px 32px;background:linear-gradient(135deg,#6366f1,#4f46e5);text-align:center">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700">Welcome to RepurposeAI!</h1>
          <p style="margin:8px 0 0;color:#c7d2fe;font-size:14px">Turn any content into social media gold</p>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 16px;color:#1f2937;font-size:15px;line-height:1.5">Hi ${name},</p>
          <p style="margin:0 0 16px;color:#4b5563;font-size:14px;line-height:1.5">
            Welcome to RepurposeAI! We're excited to have you on board. Here's how to get started:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:12px 16px;background:#f9fafb;border-radius:8px;margin-bottom:8px">
              <p style="margin:0;color:#1f2937;font-size:14px"><strong>1.</strong> Create your <a href="{{APP_URL}}/voice" style="color:#6366f1">voice profile</a></p>
            </td></tr>
            <tr><td style="padding:12px 16px;background:#f9fafb;border-radius:8px;margin-bottom:8px">
              <p style="margin:0;color:#1f2937;font-size:14px"><strong>2.</strong> Set up your <a href="{{APP_URL}}/settings" style="color:#6366f1">brand kit</a></p>
            </td></tr>
            <tr><td style="padding:12px 16px;background:#f9fafb;border-radius:8px;margin-bottom:8px">
              <p style="margin:0;color:#1f2937;font-size:14px"><strong>3.</strong> <a href="{{APP_URL}}/generate" style="color:#6366f1">Generate your first content</a></p>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;color:#4b5563;font-size:14px;line-height:1.5">
            Need help? Reply to this email or check our <a href="{{APP_URL}}/help" style="color:#6366f1">Help Center</a>.
          </p>
        </td></tr>
        <tr><td style="padding:24px 32px;background:#f9fafb;text-align:center;border-top:1px solid #e5e7eb">
          <p style="margin:0;color:#9ca3af;font-size:12px">RepurposeAI &mdash; {{APP_URL}}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
  </body>
</html>`;
}

export interface EmailBranding {
  logo?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  orgName?: string;
  headerHtml?: string | null;
  footerHtml?: string | null;
}

export function wrapWithBranding(html: string, branding?: EmailBranding | null): string {
  if (!branding) return html;

  const primary = branding.primaryColor || "#6366f1";
  const secondary = branding.secondaryColor || "#4f46e5";
  let result = html;

  result = result.replace(/background:linear-gradient\(135deg,#6366f1,#4f46e5\)/g, `background:linear-gradient(135deg,${primary},${secondary})`);
  result = result.replace(/background:linear-gradient\(135deg,#10b981,#059669\)/g, `background:linear-gradient(135deg,${secondary},${primary})`);
  result = result.replace(/background:linear-gradient\(135deg,#f59e0b,#d97706\)/g, `background:linear-gradient(135deg,${primary},${secondary})`);
  result = result.replace(/background:linear-gradient\(135deg,#ef4444,#dc2626\)/g, `background:linear-gradient(135deg,${secondary},${primary})`);
  result = result.replace(/background:#6366f1/g, `background:${primary}`);
  result = result.replace(/color:#6366f1/g, `color:${primary}`);

  if (branding.logo) {
    result = result.replace(
      /<h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700">/g,
      `<img src="${branding.logo}" alt="${branding.orgName || ""}" style="max-height:36px;margin-bottom:10px;display:block" /><h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700">`
    );
  }

  if (branding.orgName) {
    result = result.replace(/RepurposeAI/g, branding.orgName);
  }

  if (branding.headerHtml) {
    result = result.replace(
      '<table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden">',
      `<table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden">${branding.headerHtml}`
    );
  }

  if (branding.footerHtml) {
    result = result.replace('</table>', `${branding.footerHtml}</table>`);
  }

  return result;
}


export function usageWarningHtml(name: string, used: number, limit: number, percentage: number): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden">
        <tr><td style="padding:40px 32px 32px;background:linear-gradient(135deg,#f59e0b,#d97706);text-align:center">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700">Usage Alert</h1>
          <p style="margin:8px 0 0;color:#fef3c7;font-size:14px">You've used ${percentage}% of your monthly generations</p>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 16px;color:#1f2937;font-size:15px;line-height:1.5">Hi ${name},</p>
          <p style="margin:0 0 16px;color:#4b5563;font-size:14px;line-height:1.5">
            You've used <strong>${used}</strong> out of <strong>${limit}</strong> generations this month.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0">
            <tr><td style="background:#f3f4f6;border-radius:8px;padding:4px">
              <table width="${Math.min(percentage, 100)}%" cellpadding="0" cellspacing="0">
                <tr><td style="background:${percentage >= 100 ? '#ef4444' : '#f59e0b'};height:12px;border-radius:6px"></td></tr>
              </table>
            </td></tr>
          </table>
          ${percentage >= 100
            ? `<p style="margin:0 0 16px;color:#ef4444;font-size:14px;line-height:1.5">You've reached your limit. Upgrade to keep generating.</p>`
            : `<p style="margin:0 0 16px;color:#4b5563;font-size:14px;line-height:1.5">You have ${limit - used} generation${limit - used !== 1 ? 's' : ''} remaining.</p>`
          }
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/upgrade" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">Upgrade plan</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function paymentReceiptHtml(name: string, amount: number, currency: string, date: string, invoiceUrl: string | null): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden">
        <tr><td style="padding:40px 32px 32px;background:linear-gradient(135deg,#10b981,#059669);text-align:center">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700">Payment Received</h1>
          <p style="margin:8px 0 0;color:#a7f3d0;font-size:14px">Thank you for your payment</p>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 16px;color:#1f2937;font-size:15px;line-height:1.5">Hi ${name},</p>
          <p style="margin:0 0 24px;color:#4b5563;font-size:14px;line-height:1.5">
            We've received your payment of <strong>${(amount / 100).toFixed(2)} ${currency.toUpperCase()}</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;padding:16px">
            <tr><td style="padding:4px 0"><span style="color:#6b7280;font-size:13px">Amount</span></td>
                <td align="right"><span style="color:#1f2937;font-size:13px;font-weight:600">${(amount / 100).toFixed(2)} ${currency.toUpperCase()}</span></td></tr>
            <tr><td style="padding:4px 0"><span style="color:#6b7280;font-size:13px">Date</span></td>
                <td align="right"><span style="color:#1f2937;font-size:13px">${date}</span></td></tr>
          </table>
          ${invoiceUrl ? `<a href="${invoiceUrl}" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#6366f1;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">View invoice</a>` : ''}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function creditWarningHtml(name: string, balance: number, daysUntilExpiry: number | null): string {
  const isLow = balance < 10;
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden">
        <tr><td style="padding:40px 32px 32px;background:linear-gradient(135deg,#f59e0b,#d97706);text-align:center">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700">${isLow ? "Low Credit Balance" : "Credits Running Low"}</h1>
          <p style="margin:8px 0 0;color:#fef3c7;font-size:14px">You have ${balance} credit${balance !== 1 ? 's' : ''} remaining</p>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 16px;color:#1f2937;font-size:15px;line-height:1.5">Hi ${name},</p>
          <p style="margin:0 0 16px;color:#4b5563;font-size:14px;line-height:1.5">
            Your AI credit balance is running low. You currently have <strong>${balance} credit${balance !== 1 ? 's' : ''}</strong> remaining.
          </p>
          ${daysUntilExpiry ? `<p style="margin:0 0 16px;color:#ef4444;font-size:14px;line-height:1.5">Some of your credits will expire in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}.</p>` : ''}
          <p style="margin:0 0 24px;color:#4b5563;font-size:14px;line-height:1.5">
            Purchase a credit pack or upgrade your plan to keep generating without interruption.
          </p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/billing" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">Get more credits</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function upgradeSuggestionHtml(name: string, currentPlan: string, suggestedPlan: string, reason: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden">
        <tr><td style="padding:40px 32px 32px;background:linear-gradient(135deg,#6366f1,#4f46e5);text-align:center">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700">Upgrade Suggestion</h1>
          <p style="margin:8px 0 0;color:#c7d2fe;font-size:14px">You're outgrowing your ${currentPlan} plan</p>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 16px;color:#1f2937;font-size:15px;line-height:1.5">Hi ${name},</p>
          <p style="margin:0 0 16px;color:#4b5563;font-size:14px;line-height:1.5">${reason}</p>
          <p style="margin:0 0 24px;color:#4b5563;font-size:14px;line-height:1.5">
            Upgrading to <strong>${suggestedPlan}</strong> would give you more capacity, higher limits, and additional features.
          </p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/upgrade" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">See ${suggestedPlan} plan</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function expiringSubscriptionHtml(name: string, plan: string, daysLeft: number): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden">
        <tr><td style="padding:40px 32px 32px;background:linear-gradient(135deg,#3b82f6,#2563eb);text-align:center">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700">Subscription Renewal Reminder</h1>
          <p style="margin:8px 0 0;color:#bfdbfe;font-size:14px">Your ${plan} plan renews in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}</p>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 16px;color:#1f2937;font-size:15px;line-height:1.5">Hi ${name},</p>
          <p style="margin:0 0 16px;color:#4b5563;font-size:14px;line-height:1.5">
            Your <strong>${plan}</strong> subscription will renew in <strong>${daysLeft}</strong> day${daysLeft !== 1 ? 's' : ''}.
          </p>
          <p style="margin:0 0 24px;color:#4b5563;font-size:14px;line-height:1.5">
            No action needed if you'd like to continue — the renewal is automatic. If you'd like to make changes, visit your billing settings.
          </p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings/billing" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">Manage subscription</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function churnPreventionHtml(name: string, plan: string, daysSinceLastUse: number): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden">
        <tr><td style="padding:40px 32px 32px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);text-align:center">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700">We miss you!</h1>
          <p style="margin:8px 0 0;color:#ddd6fe;font-size:14px">It's been ${daysSinceLastUse} day${daysSinceLastUse !== 1 ? 's' : ''} since your last generation</p>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 16px;color:#1f2937;font-size:15px;line-height:1.5">Hi ${name},</p>
          <p style="margin:0 0 16px;color:#4b5563;font-size:14px;line-height:1.5">
            We noticed you haven't used RepurposeAI in a while. Your <strong>${plan}</strong> plan is still active and ready when you are.
          </p>
          <p style="margin:0 0 24px;color:#4b5563;font-size:14px;line-height:1.5">
            Here are a few things you can try:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:8px 16px;background:#f9fafb;border-radius:8px;margin-bottom:8px">
              <p style="margin:0;color:#1f2937;font-size:14px">✨ Repurpose a blog post into a thread</p>
            </td></tr>
            <tr><td style="padding:8px 16px;background:#f9fafb;border-radius:8px;margin-bottom:8px">
              <p style="margin:0;color:#1f2937;font-size:14px">🎤 Turn a video into social posts</p>
            </td></tr>
            <tr><td style="padding:8px 16px;background:#f9fafb;border-radius:8px;margin-bottom:8px">
              <p style="margin:0;color:#1f2937;font-size:14px">📅 Schedule a week of content in minutes</p>
            </td></tr>
          </table>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/generate" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#6366f1;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">Create something new</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function paymentFailedHtml(name: string, amount: number, currency: string, date: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 0">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden">
        <tr><td style="padding:40px 32px 32px;background:linear-gradient(135deg,#ef4444,#dc2626);text-align:center">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700">Payment Failed</h1>
          <p style="margin:8px 0 0;color:#fecaca;font-size:14px">We couldn't process your payment</p>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 16px;color:#1f2937;font-size:15px;line-height:1.5">Hi ${name},</p>
          <p style="margin:0 0 24px;color:#4b5563;font-size:14px;line-height:1.5">
            We attempted to charge <strong>${(amount / 100).toFixed(2)} ${currency.toUpperCase()}</strong> on ${date}, but the payment failed.
          </p>
          <p style="margin:0 0 24px;color:#4b5563;font-size:14px;line-height:1.5">
            Please update your payment method to avoid service interruption.
          </p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/api/billing/portal" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">Update payment method</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
