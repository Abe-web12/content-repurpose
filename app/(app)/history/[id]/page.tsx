"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { GenerationDetail } from "@/components/history/generation-detail";
import { fetchGeneration } from "@/hooks/use-generations";
import type { Generation } from "@/lib/types/index";

export default function GenerationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await fetchGeneration(id);
      setGeneration(data);
      setLoading(false);
    }
    load();
  }, [id]);

  return (
    <div className="mx-auto max-w-3xl">
      <GenerationDetail generation={generation} loading={loading} />
    </div>
  );
}
