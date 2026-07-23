"use client";

import { useRouter } from "next/navigation";
import { Playground } from "@/components/studio/playground";
import { usePlayground } from "@/hooks/use-playground";

export function PlaygroundPageClient() {
  const router = useRouter();
  const playground = usePlayground();

  return (
    <div className="-mx-4 -mt-8 sm:-mx-6 lg:-mx-8">
      <Playground
        onRun={async (config) => {
          const result = await playground.execute(config);
          return {
            output: result.output,
            latency: result.latency,
            tokens: result.totalTokens,
            cost: result.estimatedCost,
          };
        }}
        onSave={() => router.push("/prompts/new")}
      />
    </div>
  );
}
