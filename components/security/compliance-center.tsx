"use client";

import { useState } from "react";
import { useCompliance, useComplianceActions } from "@/hooks/use-security";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Download, FileText, Check, X, AlertTriangle, Eye, Trash2 } from "lucide-react";

export function ComplianceCenter() {
  const { consents, requests, exportData, loading, refetch, exportUserData } = useCompliance();
  const { recordConsent, createPrivacyRequest } = useComplianceActions();
  const [openRequest, setOpenRequest] = useState(false);
  const [requestType, setRequestType] = useState("");
  const [details, setDetails] = useState("");
  const [creating, setCreating] = useState(false);

  const handleExport = async () => {
    await exportUserData();
  };

  const handleCreateRequest = async () => {
    if (!requestType) return;
    setCreating(true);
    try {
      await createPrivacyRequest(requestType, details ? { description: details } : undefined);
      setOpenRequest(false);
      setRequestType("");
      setDetails("");
      refetch();
    } finally {
      setCreating(false);
    }
  };

  const handleConsent = async (type: string, granted: boolean) => {
    await recordConsent(type, granted);
    refetch();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-400" />
          Compliance & Privacy
        </CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="mr-1 h-4 w-4" /> Export Data
          </Button>
          <Dialog open={openRequest} onOpenChange={setOpenRequest}>
            <DialogTrigger asChild>
              <Button size="sm"><FileText className="mr-1 h-4 w-4" /> New Request</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Privacy Request</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300">Request Type</label>
                  <Select value={requestType} onValueChange={setRequestType}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DATA_ACCESS">Access My Data</SelectItem>
                      <SelectItem value="DATA_DELETION">Delete My Data</SelectItem>
                      <SelectItem value="DATA_PORTABILITY">Port My Data</SelectItem>
                      <SelectItem value="DATA_CORRECTION">Correct My Data</SelectItem>
                      <SelectItem value="WITHDRAW_CONSENT">Withdraw Consent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300">Details (optional)</label>
                  <textarea
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-200 outline-none focus:border-indigo-500"
                    rows={3}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Describe your request..."
                  />
                </div>
                <Button className="w-full" onClick={handleCreateRequest} disabled={creating || !requestType}>
                  {creating ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {exportData && (
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-green-400" />
                <span className="text-sm font-medium text-green-400">Data Export Ready</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => {
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = "my-data.json"; a.click();
                URL.revokeObjectURL(url);
              }}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <div>
          <h4 className="mb-3 text-sm font-medium text-gray-300">Privacy Consents</h4>
          {loading ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : consents.length === 0 ? (
            <p className="text-sm text-gray-500">No consent records found</p>
          ) : (
            <div className="space-y-2">
              {consents.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-4 py-3">
                  <div className="flex items-center gap-3">
                    {c.granted ? (
                      <Check className="h-5 w-5 text-green-400" />
                    ) : (
                      <X className="h-5 w-5 text-red-400" />
                    )}
                    <div>
                      <span className="text-sm text-gray-200">{c.type.replace(/_/g, " ")}</span>
                      <p className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Badge variant={c.granted ? "default" : "secondary"}>
                    {c.granted ? "Granted" : "Revoked"}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => handleConsent("MARKETING_EMAILS", true)}>
              Accept Marketing
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleConsent("MARKETING_EMAILS", false)}>
              Decline Marketing
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleConsent("DATA_PROCESSING", true)}>
              Accept Data Processing
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleConsent("DATA_PROCESSING", false)}>
              Decline Data Processing
            </Button>
          </div>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-medium text-gray-300">Privacy Requests</h4>
          {loading ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : requests.length === 0 ? (
            <p className="text-sm text-gray-500">No privacy requests submitted</p>
          ) : (
            <div className="space-y-2">
              {requests.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-4 py-3">
                  <div className="flex items-center gap-3">
                    {r.requestType === "DATA_DELETION" ? (
                      <Trash2 className="h-5 w-5 text-red-400" />
                    ) : r.requestType === "DATA_ACCESS" ? (
                      <Eye className="h-5 w-5 text-blue-400" />
                    ) : (
                      <FileText className="h-5 w-5 text-indigo-400" />
                    )}
                    <div>
                      <span className="text-sm text-gray-200">{r.requestType.replace(/_/g, " ")}</span>
                      <p className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Badge variant={r.status === "COMPLETED" ? "default" : r.status === "IN_PROGRESS" ? "secondary" : "outline"}>
                    {r.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
