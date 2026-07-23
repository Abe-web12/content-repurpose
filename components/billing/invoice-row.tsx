"use client";

import { FileText, Download, ExternalLink, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InvoiceRowProps {
  amount: number;
  currency: string;
  status: string;
  hostedInvoiceUrl: string | null;
  pdfUrl: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  paidAt: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PAID: { label: "Paid", color: "text-emerald-600 bg-emerald-50", icon: CheckCircle2 },
  OPEN: { label: "Open", color: "text-amber-600 bg-amber-50", icon: Clock },
  DRAFT: { label: "Draft", color: "text-gray-600 bg-gray-50", icon: FileText },
  VOID: { label: "Void", color: "text-red-600 bg-red-50", icon: XCircle },
  UNCOLLECTIBLE: { label: "Uncollectible", color: "text-red-600 bg-red-50", icon: AlertCircle },
};

function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function InvoiceRow({ amount, currency, status, hostedInvoiceUrl, pdfUrl, periodStart, periodEnd, createdAt }: InvoiceRowProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.OPEN;
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-4 rounded-lg border border-surface-2 p-4 transition-colors hover:bg-surface-1">
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", config.color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-text-primary">
            {formatCurrency(amount, currency)}
          </p>
          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", config.color)}>
            {config.label}
          </span>
        </div>
        <p className="text-xs text-text-muted">
          {new Date(createdAt).toLocaleDateString()}
          {periodStart && periodEnd && (
            <> &middot; {new Date(periodStart).toLocaleDateString()} - {new Date(periodEnd).toLocaleDateString()}</>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {pdfUrl && (
          <Button variant="ghost" size="icon-sm" asChild>
            <a href={pdfUrl} target="_blank" rel="noreferrer" title="Download PDF">
              <Download className="h-4 w-4" />
            </a>
          </Button>
        )}
        {hostedInvoiceUrl && (
          <Button variant="ghost" size="icon-sm" asChild>
            <a href={hostedInvoiceUrl} target="_blank" rel="noreferrer" title="View invoice">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
