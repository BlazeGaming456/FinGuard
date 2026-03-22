export async function POST(request) {
  const body = await request.json();

  const res = await fetch(`${process.env.ML_SERVICE_URL}/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json();
    return Response.json(
      { error: err.detail || "Simulation service unavailable" },
      { status: res.status },
    );
  }

  const data = await res.json();
  return Response.json(data);
}