"use client"

import { useState, useEffect } from "react"
import { signOut } from "next-auth/react"
import PageHeader from "@/components/PageHeader"

export default function SettingsPage () {
  const [userEmail, setUserEmail] = useState("")
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" })
  const [passwordMsg, setPasswordMsg] = useState(null)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  useEffect(() => {
    fetch("/api/auth/session")
      .then(r => r.json())
      .then(data => {
        if (data?.user?.email) setUserEmail(data.user.email)
      })
  }, [])

  const handlePasswordChange = async e => {
    e.preventDefault()
    setPasswordMsg(null)

    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordMsg({ type: "error", text: "New passwords do not match" })
      return
    }
    if (passwordForm.next.length < 8) {
      setPasswordMsg({ type: "error", text: "Password must be at least 8 characters" })
      return
    }

    setPasswordLoading(true)
    try {
      const res = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: passwordForm.current, newPassword: passwordForm.next })
      })
      const data = await res.json()
      if (!res.ok) {
        setPasswordMsg({ type: "error", text: data.error })
      } else {
        setPasswordMsg({ type: "success", text: "Password updated successfully" })
        setPasswordForm({ current: "", next: "", confirm: "" })
      }
    } catch {
      setPasswordMsg({ type: "error", text: "Something went wrong" })
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleteError("")
    if (deleteConfirm !== "DELETE") {
      setDeleteError("Type DELETE (all caps) to confirm")
      return
    }

    setDeleteLoading(true)
    try {
      const res = await fetch("/api/settings/delete-account", { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        setDeleteError(data.error || "Failed to delete account")
        return
      }
      await signOut({ callbackUrl: "/" })
    } catch {
      setDeleteError("Something went wrong")
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Settings"
        subtitle={
          <>
            Signed in as <span className="text-accent-light">{userEmail || "..."}</span>
          </>
        }
        badge="Account"
      />

      <div className="stagger-item glass-card rounded-2xl p-7">
        <h2 className="text-base font-semibold text-text-primary mb-1">Change Password</h2>
        <p className="text-text-secondary text-sm mb-6">
          Only available for email/password accounts. OAuth accounts (Google) manage passwords externally.
        </p>

        <form onSubmit={handlePasswordChange} className="flex flex-col gap-3.5">
          {[
            { label: "Current password", key: "current", placeholder: "Your current password" },
            { label: "New password", key: "next", placeholder: "Min. 8 characters" },
            { label: "Confirm new password", key: "confirm", placeholder: "Repeat new password" }
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="text-xs text-text-secondary block mb-1.5">{label}</label>
              <input
                type="password"
                required
                placeholder={placeholder}
                value={passwordForm[key]}
                onChange={e => setPasswordForm(p => ({ ...p, [key]: e.target.value }))}
                className="input-field"
              />
            </div>
          ))}

          {passwordMsg && (
            <div className={`rounded-lg px-3.5 py-2.5 text-sm border ${
              passwordMsg.type === "success"
                ? "bg-success/10 border-success/30 text-success"
                : "bg-danger/10 border-danger/30 text-danger"
            }`}>
              {passwordMsg.text}
            </div>
          )}

          <button type="submit" disabled={passwordLoading} className="btn-primary w-fit">
            {passwordLoading ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>

      <div className="stagger-item glass-card rounded-2xl p-7 border-danger/20 bg-danger/[0.03]">
        <h2 className="text-base font-semibold text-danger mb-1">Delete Account</h2>
        <p className="text-text-secondary text-sm mb-6">
          This permanently deletes your account and all transaction data. This cannot be undone.
        </p>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-text-secondary block mb-1.5">
              Type <span className="text-danger font-mono">DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              className="input-field border-danger/30 focus:border-danger/50"
            />
          </div>

          {deleteError && (
            <div className="bg-danger/10 border border-danger/30 rounded-lg px-3.5 py-2.5 text-danger text-sm">
              {deleteError}
            </div>
          )}

          <button
            onClick={handleDeleteAccount}
            disabled={deleteLoading}
            className="px-4 py-2.5 rounded-lg bg-danger/15 text-danger text-sm font-semibold border border-danger/30 hover:bg-danger/20 disabled:opacity-60 cursor-pointer w-fit"
          >
            {deleteLoading ? "Deleting..." : "Delete my account"}
          </button>
        </div>
      </div>
    </div>
  )
}
