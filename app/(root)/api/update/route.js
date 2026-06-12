import prisma from "@/lib/prisma"
import { auth } from "@/auth"

export async function POST(req) {
  const session = await auth()

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = parseInt(session.user.id)
  const { updates } = await req.json()

  await Promise.all(
    updates.map(({ id, category }) =>
      prisma.transactions.updateMany({
        where: {
          id: parseInt(id),
          userId,              // ensures you can only update your own
        },
        data: { category },
      })
    )
  )

  return Response.json({ success: true })
}