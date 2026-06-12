export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return Response.json(
        { error: 'No PDF file was uploaded. Please select a PDF file.' },
        { status: 400 },
      )
    }

    const targetUrl = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000'
    const backendForm = new FormData()
    backendForm.append('file', file, file.name)

    let res
    try {
      res = await fetch(`${targetUrl}/extract-pdf`, {
        method: 'POST',
        body: backendForm,
        signal: AbortSignal.timeout(120_000),
      })
    } catch (error) {
      return Response.json(
        {
          error:
            'PDF extraction service is unavailable. Upload a CSV export instead, or start the ML service with Ollama for advanced PDF parsing.',
          detail: error.message,
        },
        { status: 503 },
      )
    }

    const payload = await res.json().catch(() => null)

    if (!res.ok) {
      return Response.json(
        {
          error:
            payload?.detail || payload?.error || 'PDF extraction failed.',
        },
        { status: res.status },
      )
    }

    return Response.json(payload)
  } catch (error) {
    return Response.json(
      { error: error.message || 'Unexpected PDF extraction error.' },
      { status: 500 },
    )
  }
}
