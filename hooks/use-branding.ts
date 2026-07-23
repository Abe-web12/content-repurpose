"use client";

import { useState, useCallback, useEffect } from "react";

export interface BrandingState {
  logo: string | null;
  logoLight: string | null;
  logoDark: string | null;
  favicon: string | null;
  brandColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  customFont: string | null;
  fontFamily: string | null;
  emailBrandingEnabled: boolean;
  emailHeaderHtml: string | null;
  emailFooterHtml: string | null;
  loadingScreenHtml: string | null;
}

export interface DomainState {
  domain: string | null;
  domainVerified: boolean;
  domainVerificationCode: string | null;
  sslStatus: string | null;
  isPrimaryDomain: boolean;
}

export function useBranding(orgId: string | null) {
  const [branding, setBranding] = useState<BrandingState | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBranding = useCallback(async () => {
    if (!orgId) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await window.fetch(`/api/branding?orgId=${orgId}`);
      const json = await res.json();
      if (res.ok && json.data) setBranding(json.data);
    } catch {} finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { fetchBranding(); }, [fetchBranding]);

  const updateBranding = useCallback(async (data: Partial<BrandingState>): Promise<boolean> => {
    if (!orgId) return false;
    const res = await window.fetch("/api/branding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, ...data }),
    });
    const json = await res.json();
    if (res.ok && json.data) setBranding(json.data);
    return res.ok;
  }, [orgId]);

  const resetBranding = useCallback(async (): Promise<boolean> => {
    if (!orgId) return false;
    const res = await window.fetch("/api/branding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, action: "reset" }),
    });
    const json = await res.json();
    if (res.ok && json.data) setBranding(json.data);
    return res.ok;
  }, [orgId]);

  return { branding, loading, refetch: fetchBranding, updateBranding, resetBranding };
}

export function useDomain(orgId: string | null) {
  const [domain, setDomain] = useState<DomainState | null>(null);
  const [loading, setLoading] = useState(true);
  const [instructions, setInstructions] = useState<Array<{ type: string; name: string; value: string; purpose: string }> | null>(null);

  const fetchDomain = useCallback(async () => {
    if (!orgId) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await window.fetch(`/api/domains?orgId=${orgId}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setDomain(json.data);
        if (json.data.domain && json.data.domainVerificationCode) {
          setInstructions([
            { type: "TXT", name: `_repurposeai-verify.${json.data.domain}`, value: `repurposeai-verification=${json.data.domainVerificationCode}`, purpose: "Domain ownership verification" },
            { type: "CNAME", name: json.data.domain, value: "app.repurpurposeai.com", purpose: "Route traffic" },
            { type: "TXT", name: json.data.domain, value: "v=spf1 include:spf.resend.com ~all", purpose: "Email authentication" },
          ]);
        }
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { fetchDomain(); }, [fetchDomain]);

  const updateDomain = useCallback(async (domain: string): Promise<boolean> => {
    if (!orgId) return false;
    const res = await window.fetch("/api/domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, domain }),
    });
    const json = await res.json();
    if (res.ok && json.data) {
      setDomain(json.data);
      setInstructions([
        { type: "TXT", name: `_repurposeai-verify.${json.data.domain}`, value: `repurposeai-verification=${json.data.domainVerificationCode}`, purpose: "Domain ownership verification" },
        { type: "CNAME", name: json.data.domain, value: "app.repurpurposeai.com", purpose: "Route traffic" },
        { type: "TXT", name: json.data.domain, value: "v=spf1 include:spf.resend.com ~all", purpose: "Email authentication" },
      ]);
    }
    return res.ok;
  }, [orgId]);

  const removeDomain = useCallback(async (): Promise<boolean> => {
    if (!orgId) return false;
    const res = await window.fetch("/api/domains", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId }),
    });
    if (res.ok) { setDomain(null); setInstructions(null); }
    return res.ok;
  }, [orgId]);

  return { domain, loading, instructions, refetch: fetchDomain, updateDomain, removeDomain };
}
