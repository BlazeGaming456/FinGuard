export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const horizon = searchParams.get("horizon") || "6";

    const res = await fetch(`http://localhost:8000/forecast?horizon=${horizon}`);

    if (!res.ok) {
        return new Response.json(
            {
                status: 502,
                error: "Forecast service unavailable",
            }
        )
    }

    const data = await res.json();
    return new Response.json(data);
}