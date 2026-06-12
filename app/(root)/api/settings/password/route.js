import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import bcrypt from "bcryptjs"

export async function POST(req) {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const userId = parseInt(session.user.id)
    const { currentPassword, newPassword } = await req.json()

    const user = await prisma.user.findUnique({ where: { id: userId } })

    // OAuth users have no password — block this flow for them
    if (!user?.password) {
      return Response.json({ error: "OAuth accounts cannot change password here" }, { status: 400 })
    }

    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) {
      return Response.json({ error: "Current password is incorrect" }, { status: 400 })
    }

    const hashed = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } })

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}