import { auth } from "@/auth";

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = parseInt(session.user.id);
  const body = await request.json();

  const res = await fetch(`${process.env.ML_SERVICE_URL}/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, user_id: userId }),
    cache: "no-store",
  });

  const responseText = await res.text();
  let payload = null;
  try {
    payload = JSON.parse(responseText);
  } catch (error) {
    payload = null;
  }

  if (!res.ok) {
    const errorMessage =
      payload?.detail || payload?.error || "Simulation service unavailable";
    return Response.json({ error: errorMessage }, { status: res.status });
  }

  return Response.json(payload ?? { error: "Invalid simulation response" });
}
