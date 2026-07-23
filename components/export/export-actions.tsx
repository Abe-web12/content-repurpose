"use client";

import { useState } from "react";
import { Copy, Download, FileText, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { showSuccess, showError } from "@/components/ui/toast";

interface ExportActionsProps {
  content: string;
  filename?: string;
}

export function ExportActions({ content, filename = "content" }: ExportActionsProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      showSuccess("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showError("Failed to copy");
    }
  };

  const downloadMarkdown = () => {
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess("Downloaded as Markdown");
  };

  const downloadTxt = () => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess("Downloaded as Text");
  };

  const downloadPdf = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const lines = doc.splitTextToSize(content, 180);
      doc.setFontSize(11);
      let y = 20;
      for (const line of lines) {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 15, y);
        y += 7;
      }
      doc.save(`${filename}.pdf`);
      showSuccess("Downloaded as PDF");
    } catch {
      showError("PDF generation failed. Try another format.");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={copyToClipboard}
        className="gap-2"
      >
        <Copy className="h-4 w-4" />
        {copied ? "Copied!" : "Copy"}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Download
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={downloadMarkdown} className="gap-3">
            <FileText className="h-4 w-4" />
            Markdown (.md)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={downloadTxt} className="gap-3">
            <FileText className="h-4 w-4" />
            Plain Text (.txt)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={downloadPdf} className="gap-3">
            <FileDown className="h-4 w-4" />
            PDF (.pdf)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
