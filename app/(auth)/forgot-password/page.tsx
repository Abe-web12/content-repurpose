"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { useSignIn } from "@clerk/nextjs";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showError, showSuccess } from "@/components/ui/toast";

export default function ForgotPasswordPage() {
  const { signIn } = useSignIn();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEmailError(undefined);

    const result = forgotPasswordSchema.safeParse({ email });

    if (!result.success) {
      setEmailError(result.error.flatten().fieldErrors.email?.[0]);
      return;
    }

    setLoading(true);

    try {
      const { error } = await (signIn as any).create({
        strategy: "reset_password_email_code",
        identifier: result.data.email,
      });

      if (error) {
        showError(error.message);
        return;
      }

      setSent(true);
      showSuccess("Reset link sent.");
    } catch (err: any) {
      showError(err.errors?.[0]?.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.1em] text-brand-600">
          Email sent
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
          Check your inbox
        </h2>
        <p className="mt-4 text-base leading-7 text-text-secondary">
          If an account exists for <strong>{email}</strong>, you'll receive a reset link.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.1em] text-brand-600">
        Account recovery
      </p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
        Reset your password
      </h2>
      <p className="mt-3 text-base leading-7 text-text-secondary">
        Enter your email and we'll send a secure reset link.
      </p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-text-primary">
            Email
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={emailError}
            icon={<Mail className="h-4 w-4" />}
          />
        </div>

        <Button type="submit" size="lg" loading={loading} className="w-full">
          Send reset link
        </Button>
      </form>

      <Link
        href="/login"
        className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Link>
    </div>
  );
}
