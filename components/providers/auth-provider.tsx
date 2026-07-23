"use client"

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  type ReactNode,
} from "react"
import { useUser, useAuth as useClerkAuth } from "@clerk/nextjs"

interface ClerkUser {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  imageUrl: string
  user_metadata: Record<string, unknown>
}

interface AuthContextValue {
  user: ClerkUser | null
  profile: any | null
  organizationId: string | null
  loading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  organizationId: null,
  loading: true,
  refreshProfile: async () => {},
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded: userLoaded, user: clerkUser } = useUser()
  const { signOut: clerkSignOut, isSignedIn } = useClerkAuth()
  const [profile, setProfile] = useState<any | null>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)

  const user: ClerkUser | null = isSignedIn && clerkUser ? {
    id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress || "",
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    imageUrl: clerkUser.imageUrl,
    user_metadata: clerkUser.publicMetadata || {},
  } : null

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const response = await fetch("/api/auth/me")
      if (response.ok) {
        const json = await response.json()
        if (json.user) {
          setProfile(json.user)
          setOrganizationId(json.organizationId ?? null)
          return json.user
        }
      }
    } catch {}
    return null
  }, [])

  useEffect(() => {
    if (!userLoaded) return
    if (!user || !user.id) {
      setProfile(null)
      setProfileLoaded(true)
      return
    }
    setProfileLoaded(false)
    fetchProfile(user.id).finally(() => setProfileLoaded(true))
  }, [userLoaded, user?.id, fetchProfile])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    await fetchProfile(user.id)
  }, [user, fetchProfile])

  const signOut = useCallback(async () => {
    await clerkSignOut({ redirectUrl: "/login" })
  }, [clerkSignOut])

  const loading = !userLoaded || (!!isSignedIn && !profileLoaded)

  return (
    <AuthContext.Provider value={{ user, profile, organizationId, loading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
