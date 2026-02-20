import prisma from "@/lib/prisma.ts";

export async function POST(request) {
  try {
    const body = await request.json();
    console.log(body);
    const transaction = await prisma.transactions.createMany({
      data: body.filter(t => t.date && t.transaction_id).map((transc) => ({
        transaction_id: transc.transaction_id,
        date: new Date(transc.date),
        description: transc.description,
        amount: Number(transc.amount),
        type: transc.type,
        category: transc.category,
        // userId: 1,
      })),
      skipDuplicates: true, // Skip records with duplicate transaction_id
    });
    return Response.json({ success: true, transaction }, { status: 200 });
  } catch (error) {
    console.log(error.message);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}
