"use client";

import { useState, useCallback, useEffect } from "react";

export interface OrgMember {
  id: string;
  role: string;
  userId: string;
  isSuspended: boolean;
  joinedAt: string;
  user: { id: string; email: string; fullName: string | null; avatarUrl: string | null; plan: string };
  invitedBy: { id: string; fullName: string | null; email: string } | null;
}

export interface OrgData {
  org: { id: string; name: string; slug: string; logo: string | null; plan: string; maxSeats: number; timezone: string; brandColor: string | null; domain: string | null };
  members: OrgMember[];
  role: string;
}

export function useOrganization(orgId: string | null) {
  const [data, setData] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!orgId) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await window.fetch(`/api/team?orgId=${orgId}`);
      const json = await res.json();
      if (res.ok && json.data) setData(json.data);
    } catch {} finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, refetch: fetchData };
}

export function useOrganizationList() {
  const [orgs, setOrgs] = useState<Array<{ id: string; name: string; slug: string; logo: string | null; plan: string; maxSeats: number; role: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.fetch("/api/organizations")
      .then((r) => r.json())
      .then((json) => { if (Array.isArray(json.data)) setOrgs(json.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { orgs, loading };
}

export function useTeamMembers(orgId: string | null) {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!orgId) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await window.fetch(`/api/team/members?orgId=${orgId}`);
      const json = await res.json();
      if (Array.isArray(json.data)) setMembers(json.data);
    } catch {} finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { members, loading, refetch: fetchData };
}

export function useTeamInvites(orgId: string | null) {
  const [invites, setInvites] = useState<Array<{ id: string; email: string; role: string; token: string; expiresAt: string; createdAt: string; invitedBy: { id: string; fullName: string | null; email: string } | null }>>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!orgId) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await window.fetch(`/api/team/invites?orgId=${orgId}`);
      const json = await res.json();
      if (Array.isArray(json.data)) setInvites(json.data);
    } catch {} finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { invites, loading, refetch: fetchData };
}

export function useUserInvitations() {
  const [invitations, setInvitations] = useState<Array<{ id: string; organization: { id: string; name: string; slug: string; logo: string | null }; role: string; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.fetch("/api/team/invites")
      .then((r) => r.json())
      .then((json) => { if (Array.isArray(json.data)) setInvitations(json.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { invitations, loading };
}

export function useTeamActivity(orgId: string | null) {
  const [logs, setLogs] = useState<Array<{ id: string; actorId: string; action: string; entityType: string; entityId: string | null; details: any; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    window.fetch(`/api/team/activity?orgId=${orgId}&limit=50`)
      .then((r) => r.json())
      .then((json) => { if (Array.isArray(json.data)) setLogs(json.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orgId]);

  return { logs, loading };
}

export function useInviteActions() {
  const [loading, setLoading] = useState(false);

  const createInvite = useCallback(async (orgId: string, email: string, role?: string) => {
    setLoading(true);
    try {
      const res = await window.fetch("/api/team/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, email, role }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      return json.data;
    } finally {
      setLoading(false);
    }
  }, []);

  const acceptInvite = useCallback(async (token: string) => {
    setLoading(true);
    try {
      const res = await window.fetch("/api/team/invites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept", token }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      return json.data;
    } finally {
      setLoading(false);
    }
  }, []);

  const rejectInvite = useCallback(async (token: string) => {
    await window.fetch("/api/team/invites", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", token }),
    });
  }, []);

  const revokeInvite = useCallback(async (orgId: string, inviteId: string) => {
    await window.fetch("/api/team/invites", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revoke", orgId, inviteId }),
    });
  }, []);

  const resendInvite = useCallback(async (orgId: string, inviteId: string) => {
    const res = await window.fetch("/api/team/invites", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resend", orgId, inviteId }),
    });
    const json = await res.json();
    return json.data;
  }, []);

  return { createInvite, acceptInvite, rejectInvite, revokeInvite, resendInvite, loading };
}

export function useMemberActions() {
  const changeRole = useCallback(async (orgId: string, userId: string, role: string) => {
    const res = await window.fetch("/api/team/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, userId, action: "change_role", role }),
    });
    return res.ok;
  }, []);

  const removeMember = useCallback(async (orgId: string, userId: string) => {
    const res = await window.fetch("/api/team/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, userId }),
    });
    return res.ok;
  }, []);

  const suspendMember = useCallback(async (orgId: string, userId: string) => {
    const res = await window.fetch("/api/team/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, userId, action: "suspend" }),
    });
    return res.ok;
  }, []);

  const unsuspendMember = useCallback(async (orgId: string, userId: string) => {
    const res = await window.fetch("/api/team/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, userId, action: "unsuspend" }),
    });
    return res.ok;
  }, []);

  const transferOwnership = useCallback(async (orgId: string, userId: string) => {
    const res = await window.fetch("/api/team/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, userId, action: "transfer_ownership" }),
    });
    return res.ok;
  }, []);

  return { changeRole, removeMember, suspendMember, unsuspendMember, transferOwnership };
}
