"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { ErrorState } from "@/components/shared/error-state";
import { VoiceForm } from "@/components/voice/voice-form";
import type { VoiceProfile } from "@/lib/types/index";
import { showError, showSuccess } from "@/components/ui/toast";

export default function EditVoicePage() {
  const params = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const profileId = params.id as string;

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(`/api/voice/${profileId}`);
        if (!response.ok) {
          setError(true);
          setLoading(false);
          return;
        }
        const json = await response.json();
        if (json.data) {
          setProfile(json.data);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      }
      setLoading(false);
    }

    load();
  }, [profileId]);

  async function handleUpdate(formData: any) {
    const response = await fetch("/api/voice", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: profileId, ...formData }),
    });

    const json = await response.json();

    if (!response.ok) {
      showError(typeof json.error === "string" ? json.error : "Update failed");
      return null;
    }

    showSuccess("Voice profile updated");
    router.push("/voice");
    return json.data;
  }

  if (loading) {
    return (
      <div className="space-y-10">
        <PageHeader title="Edit Voice Profile" />
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="space-y-10">
        <PageHeader title="Edit Voice Profile" />
        <ErrorState
          title="Profile not found"
          description="This voice profile doesn't exist or you don't have access."
          onRetry={() => router.push("/voice")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader
        title={`Edit: ${profile.name}`}
        description="Update your writing examples and tone preferences."
      />

      <div className="max-w-2xl">
        <VoiceForm
          initialData={profile}
          onSubmit={handleUpdate}
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}