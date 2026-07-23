"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Mic2, Palette, Sparkles, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VoiceForm } from "@/components/voice/voice-form";
import { BrandKitForm } from "@/components/settings/brand-kit-form";
import { useVoiceProfiles } from "@/hooks/use-voice-profiles";
import { showSuccess } from "@/components/ui/toast";

interface OnboardingWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

const STEPS = [
  { id: "welcome", label: "Welcome", icon: Sparkles },
  { id: "voice", label: "Voice Profile", icon: Mic2 },
  { id: "brand-kit", label: "Brand Kit", icon: Palette },
  { id: "generate", label: "Generate Content", icon: Check },
];

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const { createProfile } = useVoiceProfiles();

  const handleVoiceSubmit = async (data: any) => {
    const result = await createProfile(data);
    if (result) {
      showSuccess("Voice profile created!");
      setStep(2);
    }
    return result;
  };

  const handleBrandKitSubmit = async () => {
    showSuccess("Brand Kit saved!");
    setStep(3);
  };

  const handleGenerateLater = () => {
    onComplete();
  };

  const steps = [
    {
      content: (
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-100">
            <Sparkles className="h-10 w-10 text-brand-600" />
          </div>
          <h2 className="text-3xl font-bold text-text-primary">
            Welcome to RepurposeAI!
          </h2>
          <p className="mx-auto max-w-md text-text-secondary">
            Turn any content into LinkedIn posts, Twitter threads, and carousels
            in seconds. Let&apos;s get you set up in 3 quick steps.
          </p>
          <div className="mx-auto max-w-sm space-y-3">
            {[
              "Create your voice profile",
              "Set up your brand kit",
              "Generate your first content",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border border-surface-3 bg-white p-3 text-left">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-600">
                  {i + 1}
                </div>
                <span className="text-sm font-medium text-text-primary">{item}</span>
              </div>
            ))}
          </div>
          <Button size="lg" onClick={() => setStep(1)} className="w-full sm:w-auto">
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ),
    },
    {
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100">
              <Mic2 className="h-8 w-8 text-brand-600" />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-text-primary">
              Create Your Voice Profile
            </h2>
            <p className="mt-1 text-text-secondary">
              Paste writing samples so the AI matches your tone and style.
            </p>
          </div>
          <VoiceForm
            onSubmit={handleVoiceSubmit}
            submitLabel="Save & Continue"
          />
        </div>
      ),
    },
    {
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100">
              <Palette className="h-8 w-8 text-brand-600" />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-text-primary">
              Set Up Your Brand Kit
            </h2>
            <p className="mt-1 text-text-secondary">
              Tell us about your business so content stays on-brand.
            </p>
          </div>
          <BrandKitForm onSave={handleBrandKitSubmit} />
        </div>
      ),
    },
    {
      content: (
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-100">
            <Check className="h-10 w-10 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-bold text-text-primary">
            You&apos;re All Set!
          </h2>
          <p className="mx-auto max-w-md text-text-secondary">
            Your voice profile and brand kit are ready. Head to the generator to
            create your first piece of content.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button size="lg" asChild>
              <a href="/generate">
                Generate Content
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button variant="outline" onClick={handleGenerateLater}>
              Do it later
            </Button>
          </div>
        </div>
      ),
    },
  ];

  const currentStep = steps[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl"
      >
        <Card className="relative overflow-hidden border-0 shadow-2xl">
          <div className="flex items-center justify-between border-b border-surface-2 bg-white px-6 py-4">
            <div className="flex items-center gap-2">
              {STEPS.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                      i <= step
                        ? "bg-brand-600 text-white"
                        : "bg-surface-2 text-text-muted"
                    }`}
                  >
                    {i < step ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  <span
                    className={`hidden text-sm font-medium sm:inline ${
                      i <= step ? "text-text-primary" : "text-text-muted"
                    }`}
                  >
                    {s.label}
                  </span>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`mx-1 h-px w-6 ${
                        i < step ? "bg-brand-600" : "bg-surface-3"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={onSkip}
              className="rounded-lg p-1 text-text-muted hover:bg-surface-2 hover:text-text-primary transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <CardContent className="max-h-[70vh] overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {currentStep.content}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
