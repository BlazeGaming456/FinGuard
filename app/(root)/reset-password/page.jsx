"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import AuthLayout from "@/components/AuthLayout"

function ResetPasswordForm () {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setError("")

    if (!token) {
      setError("Invalid reset link")
      return
    }

    if (password !== confirm) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Something went wrong")
        return
      }

      router.push("/login?reset=success")
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="bg-danger/10 border border-danger/30 rounded-lg px-3.5 py-2.5 text-danger text-sm mb-4">
        This reset link is invalid. Please request a new one.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="text-xs text-text-secondary block mb-1.5">New password</label>
        <input
          type="password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Min. 8 characters"
          className="input-field"
        />
      </div>
      <div>
        <label className="text-xs text-text-secondary block mb-1.5">Confirm password</label>
        <input
          type="password"
          required
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="Repeat new password"
          className="input-field"
        />
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/30 rounded-lg px-3.5 py-2.5 text-danger text-sm">
          {error}
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
        {loading ? "Updating..." : "Reset password"}
      </button>
    </form>
  )
}

export default function ResetPasswordPage () {
  return (
    <AuthLayout>
      <h1 className="text-xl font-bold tracking-tight text-text-primary mb-1.5">Reset password</h1>
      <p className="text-text-secondary text-sm mb-7">
        Choose a new password for your account.
      </p>

      <Suspense fallback={<p className="text-text-secondary text-sm">Loading...</p>}>
        <ResetPasswordForm />
      </Suspense>

      <p className="text-center mt-5 text-sm text-text-secondary">
        <Link href="/login" className="text-accent no-underline hover:text-accent-light">← Back to sign in</Link>
      </p>
    </AuthLayout>
  )
}
