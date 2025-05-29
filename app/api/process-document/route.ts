import { NextResponse } from "next/server"

// Get the base URL for the FastAPI backend from environment variables
const API_BASE_URL = process.env.API_URL || "http://184.94.212.47:8001"

export async function POST(req: Request) {
  try {
    // Parse the JSON body from the incoming request
    const body = await req.json()
    const { fileName } = body

    if (!fileName) {
      return NextResponse.json({ error: "Filename is required" }, { status: 400 })
    }

    console.log(
      `Processing document ${fileName} for RAG at ${API_BASE_URL}/process_document_rag/${encodeURIComponent(fileName)}`,
    )

    // Call the backend to process the document for RAG
    const response = await fetch(`${API_BASE_URL}/process_document_rag/${encodeURIComponent(fileName)}`, {
      method: "POST",
    })

    if (!response.ok) {
      // Get the error response as text first
      const errorText = await response.text()
      let errorDetail = errorText

      // Try to parse as JSON, but don't fail if it's not JSON
      try {
        if (response.headers.get("content-type")?.includes("application/json")) {
          errorDetail = JSON.parse(errorText)
        }
      } catch (e) {
        // Keep the original error text if parsing fails
        console.warn("Error response is not valid JSON:", e)
      }

      throw new Error(
        `Processing failed with status: ${response.status}, details: ${typeof errorDetail === "object" ? JSON.stringify(errorDetail) : errorDetail}`,
      )
    }

    // Try to parse the successful response as JSON
    let data
    try {
      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        data = await response.json()
      } else {
        // Handle non-JSON successful responses
        const responseText = await response.text()
        data = { message: responseText }
      }
    } catch (parseError) {
      console.warn("Could not parse response as JSON:", parseError)
      const responseText = await response.text()
      data = { message: responseText || "Processing completed but returned non-JSON response" }
    }

    return NextResponse.json({
      success: true,
      message: `File ${fileName} processed for RAG successfully`,
      ...data,
    })
  } catch (error) {
    console.error("Error in process-document API route:", error)
    return NextResponse.json(
      {
        error: "Failed to process document for RAG",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
