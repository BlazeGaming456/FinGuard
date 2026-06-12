import prisma from "@/lib/prisma"
import { auth } from "@/auth"

export async function POST(request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = parseInt(session.user.id)
    const body = await request.json()

    const transaction = await prisma.transactions.createMany({
      data: body
        .filter((t) => t.date && t.transaction_id)
        .map((transc) => ({
          transaction_id: transc.transaction_id,
          date: new Date(transc.date),
          description: transc.description,
          amount: Number(transc.amount),
          type: transc.type,
          category: transc.category,
          userId,                    // <-- attached here
        })),
      skipDuplicates: true,
    })

    return Response.json({ success: true, transaction }, { status: 200 })
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}