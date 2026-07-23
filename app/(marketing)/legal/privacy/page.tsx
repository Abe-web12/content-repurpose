import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
      <h1 className="text-3xl font-bold tracking-tight text-text-primary">Privacy Policy</h1>
      <p className="mt-2 text-sm text-text-muted">Last updated: July 2026</p>

      <div className="mt-10 space-y-6 text-sm leading-7 text-text-secondary">
        <p>RepurposeAI (&quot;we&quot;, &quot;our&quot;) respects your privacy. This policy explains what data we collect, why, and how we handle it.</p>
        <h2 className="text-base font-semibold text-text-primary">Data we collect</h2>
        <p>Account information (email, name) provided at signup. Content you submit for repurposing (processed and stored as generation history). Usage data (generation count, plan status). Payment information is handled by Stripe and never touches our servers.</p>
        <h2 className="text-base font-semibold text-text-primary">How we use your data</h2>
        <p>To provide the repurposing service. To maintain your generation history. To process billing. To improve the product. We do not sell your data to third parties.</p>
        <h2 className="text-base font-semibold text-text-primary">Data retention</h2>
        <p>Your generations are stored until you delete them or close your account. Source content is processed during extraction and not permanently stored beyond what appears in your generation history.</p>
        <h2 className="text-base font-semibold text-text-primary">Your rights</h2>
        <p>You can export or delete your data anytime from Settings. To delete your account entirely, contact support.</p>
        <h2 className="text-base font-semibold text-text-primary">Contact</h2>
        <p>Questions about privacy? Email privacy@repurpose.ai</p>
      </div>
    </div>
  );
}
