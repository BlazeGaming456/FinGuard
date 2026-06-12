import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id);
  const { searchParams } = new URL(request.url);
  const horizon = searchParams.get("horizon") || "6";

  const transactionCount = await prisma.transactions.count({
    where: { userId },
  });
  if (transactionCount === 0) {
    return Response.json(
      { error: "No transactions found for current user" },
      { status: 404 },
    );
  }

  const res = await fetch(
    `${process.env.ML_SERVICE_URL}/forecast?horizon=${horizon}&user_id=${userId}`,
    { cache: "no-store" },
  );

  const responseText = await res.text();
  let payload = null;
  try {
    payload = JSON.parse(responseText);
  } catch (error) {
    payload = null;
  }

  if (!res.ok) {
    const errorMessage =
      payload?.detail || payload?.error || "Forecast service unavailable";
    return Response.json({ error: errorMessage }, { status: res.status });
  }

  return Response.json(payload ?? { error: "Invalid forecast response" });
}
