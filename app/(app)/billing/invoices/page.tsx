"use client";

import { Receipt, Download, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InvoiceRow } from "@/components/billing/invoice-row";
import { useInvoiceHistory } from "@/hooks/use-billing";

export default function InvoicesPage() {
  const { invoices, loading } = useInvoiceHistory();

  const paidInvoices = invoices.filter((i) => i.status === "PAID");
  const openInvoices = invoices.filter((i) => i.status === "OPEN");
  const totalPaid = paidInvoices.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Total Paid</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">
              ${(totalPaid / 100).toFixed(2)}
            </p>
            <p className="text-xs text-text-muted">{paidInvoices.length} paid invoice{paidInvoices.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Open Invoices</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">{openInvoices.length}</p>
            <p className="text-xs text-text-muted">Awaiting payment</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">Total Invoices</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">{invoices.length}</p>
            <p className="text-xs text-text-muted">All time</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
          <CardDescription>View and download your invoices</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-12 text-center">
              <Receipt className="mx-auto mb-3 h-10 w-10 text-text-muted opacity-30" />
              <p className="text-sm font-medium text-text-primary">No invoices yet</p>
              <p className="text-xs text-text-muted">Your invoices will appear here after your first payment.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv) => (
                <InvoiceRow key={inv.id} {...inv} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
