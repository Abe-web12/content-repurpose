"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react"
import { useAuth, useSignIn } from "@clerk/nextjs"
import { loginSchema } from "@/lib/validations/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { showError } from "@/components/ui/toast"

function extractClerkError(err: unknown): string {
  if (!err || typeof err !== "object") return "Something went wrong. Please try again."
  const e = err as { errors?: Array<{ longMessage?: string; message?: string }>; message?: string; longMessage?: string }
  return e.errors?.[0]?.longMessage || e.errors?.[0]?.message || e.longMessage || e.message || "Something went wrong. Please try again."
}

function LoginForm() {
  const searchParams = useSearchParams()
  const { isLoaded, isSignedIn } = useAuth()
  const { signIn } = useSignIn()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [clerkError, setClerkError] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      window.location.href = "/dashboard"
    }
  }, [isLoaded, isSignedIn])

  if (!isLoaded) return null
  if (isSignedIn) return null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrors({})
    setClerkError("")

    const result = loginSchema.safeParse({ email, password })
    if (!result.success) {
      const fe = result.error.flatten().fieldErrors
      setErrors({ email: fe.email?.[0] || "", password: fe.password?.[0] || "" })
      return
    }

    setLoading(true)
    try {
      const { error } = await signIn.create({
        identifier: result.data.email,
        password: result.data.password,
      })

      if (error) {
        const msg = extractClerkError(error)
        setClerkError(msg)
        showError(msg)
        return
      }

      if (signIn.status === "complete") {
        const { error: finalizeError } = await signIn.finalize()
        if (finalizeError) {
          const msg = extractClerkError(finalizeError)
          setClerkError(msg)
          showError(msg)
          return
        }
        const redirect = searchParams.get("redirect")
        window.location.href = redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/dashboard"
        return
      }

      const msg = "Additional verification required. Please try signing in again."
      setClerkError(msg)
      showError(msg)
    } catch (err: unknown) {
      const msg = extractClerkError(err)
      setClerkError(msg)
      showError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setClerkError("")
    try {
      const { error } = await signIn.sso({
        strategy: "oauth_google",
        redirectUrl: `${window.location.origin}/callback`,
        redirectCallbackUrl: `${window.location.origin}/dashboard`,
      })
      if (error) {
        const msg = extractClerkError(error)
        setClerkError(msg)
        showError(msg)
        setGoogleLoading(false)
      }
    } catch (err: unknown) {
      const msg = extractClerkError(err)
      setClerkError(msg)
      showError(msg)
      setGoogleLoading(false)
    }
  }

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.1em] text-indigo-300">Welcome back</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">Sign in</h2>
      <p className="mt-3 text-base leading-7 text-slate-300">Continue where you left off.</p>

      {clerkError && (
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {clerkError}
        </div>
      )}

      <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-200">Email</label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} icon={<Mail className="h-4 w-4" />} />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-slate-200">Password</label>
            <Link href="/forgot-password" className="text-sm font-medium text-indigo-300 hover:text-indigo-200">Forgot?</Link>
          </div>
          <div className="relative">
            <Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} icon={<LockKeyhole className="h-4 w-4" />} className="pr-12" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200" aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <Button type="submit" size="lg" loading={loading} className="w-full">Sign in</Button>
      </form>

      <div className="my-7 flex items-center gap-4">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs font-medium uppercase tracking-widest text-slate-400">or</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <Button
        type="button"
        variant="outline"
        size="lg"
        loading={googleLoading}
        onClick={handleGoogleLogin}
        className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-white/20"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"/></svg>
        Continue with Google
      </Button>

      <p className="mt-8 text-center text-sm text-slate-400">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-indigo-300 hover:text-indigo-200">Create an account</Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return <Suspense fallback={<div className="h-8 animate-pulse rounded bg-white/5" />}><LoginForm /></Suspense>
}
