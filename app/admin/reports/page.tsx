"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useReports } from "@/hooks/use-reports";
import { useExports } from "@/hooks/use-exports";
import { FileText, Plus, Download, Calendar } from "lucide-react";

const REPORT_TYPES = ["executive", "revenue", "customers", "ai", "workflows", "performance", "custom"];

export default function AdminReportsPage() {
  const { reports, loading, fetchData, createReport, scheduleReport } = useReports();
  const { exportData, loading: exportLoading } = useExports();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("revenue");
  const [recipients, setRecipients] = useState("");
  const [frequency, setFrequency] = useState("weekly");

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-1">Reports</h1>
      <p className="text-text-secondary text-sm mb-6">Build, schedule, and export analytics reports.</p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Plus className="w-4 h-4" /> Report Builder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-text-secondary">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Monthly Revenue Report" />
            </div>
            <div>
              <label className="text-sm text-text-secondary">Type</label>
              <select className="w-full border rounded-md p-2 bg-white" value={type} onChange={(e) => setType(e.target.value)}>
                {REPORT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => createReport({ title, type })} disabled={!title}>Create Report</Button>
            <Button variant="outline" onClick={() => exportData(type, "csv")} disabled={exportLoading}>
              <Download className="w-4 h-4 mr-1" /> Export CSV
            </Button>
            <Button variant="outline" onClick={() => exportData(type, "excel")} disabled={exportLoading}>
              <Download className="w-4 h-4 mr-1" /> Export Excel
            </Button>
            <Button variant="outline" onClick={() => exportData(type, "json")} disabled={exportLoading}>
              <Download className="w-4 h-4 mr-1" /> Export JSON
            </Button>
            <Button variant="outline" onClick={() => exportData(type, "pdf")} disabled={exportLoading}>
              <Download className="w-4 h-4 mr-1" /> Export PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Report Scheduler</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-text-secondary">Frequency</label>
              <select className="w-full border rounded-md p-2 bg-white" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-text-secondary">Recipients (comma separated emails)</label>
              <Input value={recipients} onChange={(e) => setRecipients(e.target.value)} placeholder="ops@company.com, ceo@company.com" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-3 text-text-primary">Saved Reports</h2>
        {loading ? (
          <div className="text-text-muted">Loading...</div>
        ) : (
          <div className="space-y-2">
            {reports.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-text-muted" />
                    <div>
                      <div className="font-medium text-text-primary">{r.title}</div>
                      <div className="text-xs text-text-secondary">{r.type} · {r.format} · last generated {r.lastGeneratedAt ? new Date(r.lastGeneratedAt).toLocaleDateString() : "never"}</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => scheduleReport(r.id, { frequency, recipients: recipients.split(",").map((s) => s.trim()).filter(Boolean), format: "pdf" })}>
                    Schedule
                  </Button>
                </CardContent>
              </Card>
            ))}
            {reports.length === 0 && <div className="text-text-muted text-sm">No reports yet.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
