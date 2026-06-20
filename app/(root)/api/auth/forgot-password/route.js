import crypto from "crypto";
import prisma from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/sendEmail";

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 });
    }

    const message =
      "If an account with that email exists, we sent a password reset link.";

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user?.password) {
      return Response.json({ message });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.verificationToken.deleteMany({ where: { identifier: email } });
    await prisma.verificationToken.create({
      data: { identifier: email, token, expires },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;
    const devResetUrl = resetUrl;

    try {
      await sendPasswordResetEmail(email, resetUrl);
    } catch (error) {
      console.error("Password reset email failed:", error);
    }

    return Response.json({ message, devResetUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
