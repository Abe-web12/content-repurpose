"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAlerts } from "@/hooks/use-alerts";
import { Bell, AlertTriangle, CheckCircle2 } from "lucide-react";

const ALERT_METRICS = ["mrr", "revenue_drop", "high_churn", "api_spike", "failed_workflows", "failed_ai_requests", "provider_outage", "low_credits", "low_storage", "security_incident", "webhook_failures"];

export default function AdminAlertsPage() {
  const { alerts, history, loading, fetchData, createAlert, actOnEvent } = useAlerts();
  const [name, setName] = useState("");
  const [metric, setMetric] = useState("revenue_drop");
  const [condition, setCondition] = useState("lt");
  const [threshold, setThreshold] = useState("100");

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-1">Alert Center</h1>
      <p className="text-text-secondary text-sm mb-6">Monitor revenue drops, churn spikes, failures and outages.</p>

      <Card className="mb-6">
        <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="w-4 h-4" /> Create Alert</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-text-secondary">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Revenue drop alert" />
            </div>
            <div>
              <label className="text-sm text-text-secondary">Metric</label>
              <select className="w-full border rounded-md p-2 bg-white" value={metric} onChange={(e) => setMetric(e.target.value)}>
                {ALERT_METRICS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-text-secondary">Condition</label>
              <select className="w-full border rounded-md p-2 bg-white" value={condition} onChange={(e) => setCondition(e.target.value)}>
                <option value="gt">greater than</option>
                <option value="lt">less than</option>
                <option value="gte">≥</option>
                <option value="lte">≤</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-text-secondary">Threshold</label>
              <Input type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
            </div>
          </div>
          <Button onClick={() => createAlert({ name, metric, condition, threshold: Number(threshold) })} disabled={!name}>Create Alert</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Active Alerts</CardTitle></CardHeader>
          <CardContent>
            {loading ? <div className="text-text-muted">Loading...</div> : (
              <div className="space-y-2">
                {alerts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <div className="font-medium text-text-primary">{a.name}</div>
                      <div className="text-xs text-text-secondary">{a.metric} {a.condition} {a.threshold}</div>
                    </div>
                    <Badge variant={a.enabled ? "default" : "secondary"}>{a.enabled ? "enabled" : "disabled"}</Badge>
                  </div>
                ))}
                {alerts.length === 0 && <div className="text-text-muted text-sm">No alerts configured.</div>}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Alert History</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <div className="font-medium text-text-primary text-sm">{h.message || `${h.metric} ${h.condition} ${h.threshold}`}</div>
                    <div className="text-xs text-text-secondary">{new Date(h.createdAt).toLocaleString()} · {h.status}</div>
                  </div>
                  <div className="flex gap-1">
                    {h.status === "triggered" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => actOnEvent(h.id, "acknowledge")}><CheckCircle2 className="w-3 h-3" /></Button>
                        <Button size="sm" variant="outline" onClick={() => actOnEvent(h.id, "resolve")}>Resolve</Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {history.length === 0 && <div className="text-text-muted text-sm">No alert events.</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
