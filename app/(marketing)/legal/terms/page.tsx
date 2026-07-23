import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
      <h1 className="text-3xl font-bold tracking-tight text-text-primary">Terms of Service</h1>
      <p className="mt-2 text-sm text-text-muted">Last updated: July 2026</p>

      <div className="mt-10 space-y-6 text-sm leading-7 text-text-secondary">
        <p>By using RepurposeAI, you agree to these terms. If you disagree, please do not use the service.</p>
        <h2 className="text-base font-semibold text-text-primary">Service description</h2>
        <p>RepurposeAI is an AI-powered content repurposing tool that transforms source content into platform-specific social media posts. Output quality depends on input quality and AI model capabilities.</p>
        <h2 className="text-base font-semibold text-text-primary">Your content</h2>
        <p>You retain ownership of content you submit and content generated for you. You are responsible for ensuring you have rights to any source content you provide. We do not claim ownership of your generations.</p>
        <h2 className="text-base font-semibold text-text-primary">Acceptable use</h2>
        <p>Do not use the service to generate spam, misleading content, or content that violates others&apos; rights. Do not attempt to reverse-engineer, abuse rate limits, or resell access.</p>
        <h2 className="text-base font-semibold text-text-primary">Billing</h2>
        <p>Paid plans are billed monthly via Stripe. You can cancel anytime from Settings. Refunds are handled on a case-by-case basis.</p>
        <h2 className="text-base font-semibold text-text-primary">Limitation of liability</h2>
        <p>The service is provided &quot;as is.&quot; We are not liable for AI output accuracy, missed posts, or any indirect damages arising from use of the service.</p>
      </div>
    </div>
  );
}
