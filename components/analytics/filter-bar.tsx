"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  metric?: string;
  metricOptions?: FilterOption[];
  onMetricChange?: (value: string) => void;
  period?: string;
  periodOptions?: FilterOption[];
  onPeriodChange?: (value: string) => void;
  extra?: React.ReactNode;
}

const defaultMetrics: FilterOption[] = [
  { value: "mrr", label: "MRR" },
  { value: "arr", label: "ARR" },
  { value: "revenue", label: "Revenue" },
  { value: "churn", label: "Churn" },
  { value: "customers", label: "Customers" },
  { value: "ai_usage", label: "AI Usage" },
  { value: "workflows", label: "Workflows" },
];

const defaultPeriods: FilterOption[] = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "365d", label: "1 Year" },
];

export function FilterBar({
  metric, metricOptions = defaultMetrics, onMetricChange,
  period, periodOptions = defaultPeriods, onPeriodChange,
  extra,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      {onMetricChange && (
        <div className="space-y-1">
          <Label className="text-xs text-text-secondary">Metric</Label>
          <Select value={metric} onValueChange={onMetricChange}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="Metric" />
            </SelectTrigger>
            <SelectContent>
              {metricOptions.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {onPeriodChange && (
        <div className="space-y-1">
          <Label className="text-xs text-text-secondary">Period</Label>
          <Select value={period} onValueChange={onPeriodChange}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {extra}
    </div>
  );
}
