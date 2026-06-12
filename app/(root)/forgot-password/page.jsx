"use client"

import { useState } from "react"
import Link from "next/link"
import AuthLayout from "@/components/AuthLayout"

export default function ForgotPasswordPage () {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [devResetUrl, setDevResetUrl] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setError("")
    setMessage("")
    setDevResetUrl("")
    setLoading(true)

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Something went wrong")
        return
      }

      setMessage(data.message)
      if (data.devResetUrl) setDevResetUrl(data.devResetUrl)
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-xl font-bold tracking-tight text-text-primary mb-1.5">Forgot password</h1>
      <p className="text-text-secondary text-sm mb-7">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs text-text-secondary block mb-1.5">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="input-field"
          />
        </div>

        {error && (
          <div className="bg-danger/10 border border-danger/30 rounded-lg px-3.5 py-2.5 text-danger text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-success/10 border border-success/30 rounded-lg px-3.5 py-2.5 text-success text-sm">
            {message}
          </div>
        )}

        {devResetUrl && (
          <div className="bg-accent/10 border border-accent/30 rounded-lg px-3.5 py-2.5 text-sm">
            <p className="text-accent-light mb-1.5">Development reset link:</p>
            <Link
              href={devResetUrl.slice(devResetUrl.indexOf("/reset-password"))}
              className="text-accent break-all hover:text-accent-light"
            >
              Open reset page
            </Link>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <p className="text-center mt-5 text-sm text-text-secondary">
        <Link href="/login" className="text-accent no-underline hover:text-accent-light">← Back to sign in</Link>
      </p>
    </AuthLayout>
  )
}
