"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const RANGES = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

interface RangeSelectorProps {
  value: number;
  onChange: (days: number) => void;
}

export function RangeSelector({ value, onChange }: RangeSelectorProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-surface-3 bg-surface-1 p-1">
      {RANGES.map((r) => (
        <Button
          key={r.days}
          variant="ghost"
          size="sm"
          onClick={() => onChange(r.days)}
          className={cn(
            "h-7 px-3 text-xs font-medium",
            value === r.days &&
              "bg-white text-text-primary shadow-sm hover:bg-white"
          )}
        >
          {r.label}
        </Button>
      ))}
    </div>
  );
}