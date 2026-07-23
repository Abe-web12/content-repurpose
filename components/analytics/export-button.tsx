"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { showError, showSuccess } from "@/components/ui/toast";

interface ExportButtonProps {
  days?: number;
  type?: string;
  organizationId?: string;
}

export function ExportButton({ days = 30, type = "generations", organizationId }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleExport(format: "csv" | "json") {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("format", format);
      qs.set("days", String(days));
      qs.set("type", type);
      if (organizationId) qs.set("organizationId", organizationId);
      const res = await fetch(`/api/analytics/export?${qs.toString()}`);
      if (!res.ok) {
        const json = await res.json();
        showError(json.error || "Export failed");
        return;
      }
      const blob = await res.blob();
      const ext = format === "json" ? "json" : "csv";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics-export-${days}d.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showSuccess(`Exported as ${ext.toUpperCase()}`);
    } catch {
      showError("Export failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" loading={loading}>
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("json")}>
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
