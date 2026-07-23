"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { slugify } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";

export default function CreateOrganizationPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [autoSlug, setAutoSlug] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (autoSlug) setSlug(slugify(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to create organization");
      }

      const json = await res.json();
      router.push(`/settings/teams/${json.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Team"
        description="Set up a new workspace for your team"
        action={
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        }
      />

      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>
            Give your team workspace a name and choose a URL slug.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Organization Name
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Acme Corp"
                required
                minLength={2}
                maxLength={64}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="slug" className="text-sm font-medium">
                URL Slug
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">/teams/</span>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => {
                    setAutoSlug(false);
                    setSlug(slugify(e.target.value));
                  }}
                  placeholder="acme-corp"
                  required
                  minLength={2}
                  maxLength={48}
                  pattern="^[a-z0-9-]+$"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-gray-500">
                Only lowercase letters, numbers, and hyphens.{" "}
                <button
                  type="button"
                  className="text-indigo-500 hover:underline"
                  onClick={() => {
                    setAutoSlug(true);
                    setSlug(slugify(name));
                  }}
                >
                  Auto-generate
                </button>
              </p>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Organization
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
