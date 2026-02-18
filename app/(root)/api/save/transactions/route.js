import prisma from "@/lib/prisma";

export async function POST(request) {
  try {
    const body = await request.json();
    console.log(prisma);
    const transaction = await prisma.transactions.create({
      data: {
        id: body.id,
        description: body.description,
        amount: body.amount,
        type: body.type,
        category: body.category,
        userId: 1,
      },
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
