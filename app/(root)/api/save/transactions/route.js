import { withPrismaRetry } from "@/lib/prisma"
import { auth } from "@/auth"
import crypto from "crypto"

const BATCH_SIZE = 100

function normalizeTransactionRow (transc, userId) {
  const date = new Date(transc.date)
  if (Number.isNaN(date.getTime())) return null

  const amount = Number(transc.amount)
  if (!Number.isFinite(amount) || amount <= 0) return null

  const type = transc.type === "CREDIT" ? "CREDIT" : "DEBIT"
  const description = String(transc.description || "Bank transaction").slice(0, 500)
  const category = String(transc.category || "Uncategorized").slice(0, 100)

  // Generate a deterministic transaction ID based on core details
  // This ensures identical transactions from different sources (e.g. CSV vs PDF) are deduplicated
  const dateStr = date.toISOString().split('T')[0]
  const cleanDesc = description.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
  const rawStr = `${userId}|${dateStr}|${cleanDesc}|${amount.toFixed(2)}|${type}`
  const deterministicId = crypto.createHash('sha256').update(rawStr).digest('hex')

  return {
    transaction_id: deterministicId,
    date,
    description,
    amount,
    type,
    category,
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
