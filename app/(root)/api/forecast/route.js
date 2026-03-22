export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const horizon = searchParams.get("horizon") || "6";

  const res = await fetch(
    `${process.env.ML_SERVICE_URL}/forecast?horizon=${horizon}`,
    { cache: "no-store" },
  );

  if (!res.ok) {
    return Response.json(
      { error: "Forecast service unavailable" },
      { status: 502 },
    );
  }

  const data = await res.json();
  return Response.json(data);
}