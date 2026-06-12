"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import AuthLayout from "@/components/AuthLayout"

export default function SignupPage () {
  const router = useRouter()
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setError("")

    if (form.password !== form.confirm) {
      setError("Passwords do not match")
      return
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Something went wrong")
        return
      }
      router.push("/login?registered=true")
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-xl font-bold tracking-tight text-text-primary mb-1.5">Create account</h1>
      <p className="text-text-secondary text-sm mb-7">Start analysing your finances today</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {[
          { label: "Name", key: "name", type: "text", placeholder: "Your name" },
          { label: "Email", key: "email", type: "email", placeholder: "you@example.com" },
          { label: "Password", key: "password", type: "password", placeholder: "Min. 8 characters" },
          { label: "Confirm Password", key: "confirm", type: "password", placeholder: "Repeat your password" }
        ].map(({ label, key, type, placeholder }) => (
          <div key={key}>
            <label className="text-xs text-text-secondary block mb-1.5">{label}</label>
            <input
              type={type}
              required
              value={form[key]}
              onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
              placeholder={placeholder}
              className="input-field"
            />
          </div>
        ))}

        {error && (
          <div className="bg-danger/10 border border-danger/30 rounded-lg px-3.5 py-2.5 text-danger text-sm">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-border" />
        <span className="text-text-secondary text-xs">or</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <button
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        className="btn-ghost w-full flex items-center justify-center gap-2.5"
      >
        <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        Continue with Google
      </button>

      <p className="text-center mt-5 text-sm text-text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="text-accent no-underline hover:text-accent-light">Log in</Link>
      </p>
    </AuthLayout>
  )
}
