import prisma from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET(request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = parseInt(session.user.id)

    const transactions = await prisma.transactions.findMany({
      where: { userId },
      orderBy: { date: "desc" },
    })

    return Response.json({ success: true, transactions }, { status: 200 })
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}