import { withPrismaRetry } from "@/lib/prisma"
import { auth } from "@/auth"

const BATCH_SIZE = 100

function normalizeTransactionRow (transc, userId) {
  const date = new Date(transc.date)
  if (Number.isNaN(date.getTime())) return null

  const amount = Number(transc.amount)
  if (!Number.isFinite(amount) || amount <= 0) return null

  const type = transc.type === "CREDIT" ? "CREDIT" : "DEBIT"

  return {
    transaction_id: String(transc.transaction_id),
    date,
    description: String(transc.description || "Bank transaction").slice(0, 500),
    amount,
    type,
    category: String(transc.category || "Uncategorized").slice(0, 100),
    userId,
  }
}

export async function POST(request) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = parseInt(session.user.id, 10)
    const body = await request.json()

    if (!Array.isArray(body) || body.length === 0) {
      return Response.json(
        { error: "No transactions were provided." },
        { status: 400 },
      )
    }

    const rows = body
      .map((transc) => normalizeTransactionRow(transc, userId))
      .filter(Boolean)

    if (rows.length === 0) {
      return Response.json(
        { error: "No valid transactions to save after validation." },
        { status: 400 },
      )
    }

    const result = await withPrismaRetry(async (prisma) => {
      let totalCreated = 0

      for (let index = 0; index < rows.length; index += BATCH_SIZE) {
        const batch = rows.slice(index, index + BATCH_SIZE)
        const created = await prisma.transactions.createMany({
          data: batch,
          skipDuplicates: true,
        })
        totalCreated += created.count
      }

      return { count: totalCreated }
    })

    return Response.json({ success: true, transaction: result }, { status: 200 })
  } catch (error) {
    console.error("save/transactions error:", error)
    return Response.json(
      {
        success: false,
        error:
          error.message ||
          "Failed to save transactions. Check that PostgreSQL is running.",
      },
      { status: 500 },
    )
  }
}
