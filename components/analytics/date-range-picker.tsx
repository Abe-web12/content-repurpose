"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  value: number;
  onChange: (days: number) => void;
  options?: { label: string; days: number }[];
}

const defaultOptions = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "1Y", days: 365 },
];

export function DateRangePicker({ value, onChange, options = defaultOptions }: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-surface-3 bg-white p-0.5">
      {options.map((opt) => (
        <button
          key={opt.days}
          onClick={() => onChange(opt.days)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            value === opt.days
              ? "bg-brand-500 text-white shadow-sm"
              : "text-text-secondary hover:text-text-primary"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
