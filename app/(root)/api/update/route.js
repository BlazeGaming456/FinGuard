import prisma from "@/lib/prisma.ts";

export async function POST(req) {
  const { updates } = await req.json();

  await Promise.all(
    updates.map(({ id, category }) =>
      prisma.transactions.update({
        where: { id: parseInt(id) },
        data: { category },
      }),
    ),
  );

  return Response.json({ success: true });
}
