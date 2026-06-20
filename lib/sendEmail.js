export async function sendPasswordResetEmail(to, resetUrl) {
  const apiKey = process.env.RESEND_API_KEY;

  if (apiKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "FinGuard <onboarding@resend.dev>",
        to: [to],
        subject: "Reset your FinGuard password",
        html: `
          <p>You requested a password reset for your FinGuard account.</p>
          <p><a href="${resetUrl}">Reset your password</a></p>
          <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
        `,
      }),
    });

    if (!res.ok) {
      const responseText = await res.text().catch(() => "");
      throw new Error(
        `Failed to send email: ${responseText || res.statusText}`,
      );
    }
    return;
  }

  if (process.env.NODE_ENV === "development") {
    console.log(`Password reset link for ${to}: ${resetUrl}`);
    return;
  }

  throw new Error("Email service not configured");
}
