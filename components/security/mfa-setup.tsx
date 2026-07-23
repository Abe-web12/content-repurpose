"use client";

import { useState } from "react";
import { useMFAMethods, useMFAActions } from "@/hooks/use-security";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Smartphone, Mail, Check, Copy, Key } from "lucide-react";
import { showError } from "@/components/ui/toast";

export function MFASetup() {
  const { methods, loading, refetch } = useMFAMethods();
  const { setup, confirm } = useMFAActions();
  const [step, setStep] = useState<"idle" | "setup" | "verify">("idle");
  const [setupData, setSetupData] = useState<{ secret: string; qrCode?: string } | null>(null);
  const [token, setToken] = useState("");
  const [confirming, setConfirming] = useState(false);

  const handleSetup = async () => {
    try {
      const result = await setup();
      setSetupData(result.data);
      setStep("verify");
    } catch {
      setStep("idle");
    }
  };

  const handleConfirm = async () => {
    if (!token) return;
    setConfirming(true);
    try {
      await confirm(token);
      setStep("idle");
      setToken("");
      refetch();
    } finally {
      setConfirming(false);
    }
  };

  const hasTOTP = methods.some((m) => m.type === "TOTP" && m.confirmedAt);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-400" />
          Multi-Factor Authentication
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-sm text-gray-500">Loading...</div>
        ) : step === "verify" && setupData ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-white/5 p-4">
              <p className="mb-2 text-sm font-medium text-gray-200">Scan with authenticator app</p>
              <div className="flex items-center gap-2 rounded-md bg-gray-900 p-3">
                <code className="flex-1 text-xs text-gray-300 break-all">{setupData.secret}</code>
                <Button variant="ghost" size="icon" onClick={() => navigator.clipboard.writeText(setupData.secret)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Enter the 6-digit code from your authenticator app to verify
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="000000"
                maxLength={6}
                className="w-32"
              />
              <Button onClick={handleConfirm} disabled={confirming || token.length !== 6}>
                {confirming ? "Verifying..." : "Verify"}
              </Button>
            </div>
          </div>
        ) : hasTOTP ? (
          <div className="space-y-3">
            {methods.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-4 py-3">
                <div className="flex items-center gap-3">
                  {m.type === "TOTP" ? <Smartphone className="h-5 w-5 text-indigo-400" /> : <Mail className="h-5 w-5 text-indigo-400" />}
                  <div>
                    <span className="text-sm font-medium text-gray-200">
                      {m.type === "TOTP" ? "Authenticator App" : "Email OTP"}
                    </span>
                    {m.isPrimary && <span className="ml-2 text-xs text-indigo-400">Primary</span>}
                  </div>
                </div>
                <Badge variant="default" className="bg-green-500/10 text-green-400">
                  <Check className="mr-1 h-3 w-3" /> Active
                </Badge>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={handleSetup}>
              Add Another Method
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Shield className="mb-3 h-10 w-10 text-gray-400" />
            <p className="text-sm text-gray-300">Two-factor authentication is not enabled</p>
            <p className="mt-1 text-xs text-gray-500">
              Add an extra layer of security to your account
            </p>
            <Button className="mt-4" onClick={handleSetup}>
              <Key className="mr-2 h-4 w-4" /> Enable 2FA
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
