
"use client";

import { useAuth } from "@/components/providers/auth-provider";

export function useUser() {
  const { user, profile, loading, refreshProfile, signOut } = useAuth();

  return {
    user,
    profile,
    loading,
    refreshProfile,
    signOut,
    isAuthenticated: Boolean(user),
  };
}