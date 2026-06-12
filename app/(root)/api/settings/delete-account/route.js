import prisma from "@/lib/prisma"
import { auth } from "@/auth"

export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })

    const userId = parseInt(session.user.id)

    // Cascade deletes transactions, accounts, sessions automatically
    await prisma.user.delete({ where: { id: userId } })

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}