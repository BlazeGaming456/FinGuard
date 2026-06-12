import prisma from "@/lib/prisma"
import { auth } from "@/auth"

export async function DELETE(req) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = parseInt(session.user.id)
    const { id } = await req.json()

    // deleteMany with userId check — safe, won't delete other users' data
    const result = await prisma.transactions.deleteMany({
      where: {
        id: parseInt(id),
        userId,
      },
    })

    if (result.count === 0) {
      return Response.json({ error: "Transaction not found" }, { status: 404 })
    }

    return Response.json({ success: true }, { status: 200 })
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}