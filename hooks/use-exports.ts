"use client";

import { useState, useCallback } from "react";
import { showError } from "@/components/ui/toast";

export function useExports(organizationId?: string) {
  const [loading, setLoading] = useState(false);

  const exportData = useCallback(
    async (type: string, format: "csv" | "json" | "pdf" | "excel") => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (organizationId) qs.set("organizationId", organizationId);
        qs.set("type", type);
        qs.set("format", format);
        const res = await fetch(`/api/analytics/export?${qs.toString()}`);
        if (!res.ok) {
          const json = await res.json();
          showError(json.error || "Failed to export");
          return;
        }
        if (format === "csv" || format === "json") {
          const blob = await res.blob();
          const contentDisposition = res.headers.get("Content-Disposition") || `attachment; filename=${type}.${format}`;
          const filename = contentDisposition.split("filename=")[1]?.replace(/"/g, "") || `${type}.${format}`;
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          const json = await res.json();
          showError("Export generated (binary download not available in this environment)");
        }
      } catch (err) {
        showError(err instanceof Error ? err.message : "Network error");
      } finally {
        setLoading(false);
      }
    },
    [organizationId]
  );

  return { loading, exportData };
}
