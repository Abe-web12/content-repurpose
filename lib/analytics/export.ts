import { AppError } from "@/lib/utils/api-errors";
import { ReportEngine } from "./reports";
import { AnalyticsEngine } from "./engine";
import { format } from "date-fns";

export type ExportFormat = "csv" | "json" | "pdf" | "excel";

export interface ExportOptions {
  organizationId: string;
  type: string;
  format: ExportFormat;
  dateRange?: { start: string; end: string };
  metrics?: string[];
}

export class ExportEngine {
  static async exportData(options: ExportOptions): Promise<{ data: string; filename: string; contentType: string }> {
    const { organizationId, type, format: exportFormat, dateRange, metrics } = options;

    const config = { type, metrics, dateRange: dateRange || { start: "", end: "" } };
    const dateStr = format(new Date(), "yyyy-MM-dd");
    let data: string;
    let contentType: string;
    let filename: string;

    switch (exportFormat) {
      case "csv":
        data = await ReportEngine.generateCSV(organizationId, config);
        contentType = "text/csv";
        filename = `analytics-${type}-${dateStr}.csv`;
        break;
      case "json":
        data = await ReportEngine.generateJSON(organizationId, config);
        contentType = "application/json";
        filename = `analytics-${type}-${dateStr}.json`;
        break;
      case "excel":
        data = await ExportEngine.generateExcel(organizationId, config);
        contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        filename = `analytics-${type}-${dateStr}.xlsx`;
        break;
      case "pdf":
        data = await ExportEngine.generatePDF(organizationId, config);
        contentType = "application/pdf";
        filename = `analytics-${type}-${dateStr}.pdf`;
        break;
      default:
        throw new AppError(`Unsupported format: ${exportFormat}`, 400);
    }

    return { data, filename, contentType };
  }

  private static async generatePDF(organizationId: string, config: any): Promise<string> {
    const jsonData = await ReportEngine.generateJSON(organizationId, config);
    const pdfContent = `data:application/pdf;base64,${Buffer.from(jsonData).toString("base64")}`;
    return pdfContent;
  }

  private static async generateExcel(organizationId: string, config: any): Promise<string> {
    const jsonData = await ReportEngine.generateJSON(organizationId, config);
    const parsed = JSON.parse(jsonData);
    const lines: string[] = [];
    lines.push("RepurposeAI Analytics Export");
    lines.push(`Type: ${config.type}`);
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push("");
    const walk = (obj: any, prefix = "") => {
      if (Array.isArray(obj)) {
        obj.forEach((item, idx) => walk(item, `${prefix}[${idx}]`));
      } else if (obj && typeof obj === "object") {
        for (const [k, v] of Object.entries(obj)) {
          walk(v, prefix ? `${prefix}.${k}` : k);
        }
      } else {
        lines.push(`${prefix}\t${obj}`);
      }
    };
    walk(parsed);
    return Buffer.from(lines.join("\n")).toString("base64");
  }
}
