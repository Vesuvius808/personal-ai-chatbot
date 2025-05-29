import { NextResponse } from "next/server"

// Get the base URL for the FastAPI backend from environment variables
const API_BASE_URL = process.env.API_URL || "http://184.94.212.47:8001"

export async function POST(req: Request) {
  try {
    // Extract the form data from the request (contains the file)
    const formData = await req.formData()

    // Make sure the file is present in the form data
    const file = formData.get("file")
    if (!file || !(file instanceof File)) {
      console.error("No file found in form data or file is not a File object")
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    console.log("File details:", {
      name: file.name,
      type: file.type,
      size: file.size,
    })

    // Create a new FormData object to ensure proper formatting
    const backendFormData = new FormData()
    backendFormData.append("file", file)

    // Forward the request to the FastAPI backend
    console.log(`Sending request to ${API_BASE_URL}/assess_contract_risk`)

    try {
      // Add a timeout to the fetch request
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout for large files.

      const response = await fetch(`${API_BASE_URL}/assess_contract_risk`, {
        method: "POST",
        body: backendFormData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // Check if the backend responded successfully
      if (!response.ok) {
        // Try to get more detailed error information
        let errorDetail = ""
        try {
          const errorResponse = await response.json()
          errorDetail = JSON.stringify(errorResponse)
        } catch (e) {
          // If we can't parse JSON, try to get text
          try {
            errorDetail = await response.text()
          } catch (e2) {
            errorDetail = "Could not extract error details"
          }
        }

        console.error(`Backend error (${response.status}):`, errorDetail)

        // If it's the specific error about 'documents' variable, provide a more helpful message
        if (errorDetail.includes("cannot access local variable 'documents'")) {
          return NextResponse.json(
            {
              error: "Backend processing error",
              details:
                "There was an issue processing this type of document. Please try a different file format or contact support.",
            },
            { status: 500 },
          )
        }

        return NextResponse.json(
          {
            error: `Backend responded with status: ${response.status}`,
            details: errorDetail,
          },
          { status: response.status },
        )
      }

      // Parse the JSON response from the backend
      const data = await response.json()
      console.log("Successfully received response from backend")
      return NextResponse.json(data)
    } catch (fetchError) {
      console.error("Fetch error:", fetchError)

      // Handle timeout specifically
      if (fetchError.name === "AbortError") {
        return NextResponse.json(
          {
            error: "Request timed out",
            details: "The request took too long to process. This might be due to a large file or server load.",
          },
          { status: 504 },
        )
      }

      return NextResponse.json(
        {
          error: "Failed to connect to backend service",
          details: fetchError instanceof Error ? fetchError.message : String(fetchError),
        },
        { status: 503 },
      )
    }
  } catch (error) {
    // Handle any errors that occurred during the upload
    console.error("Error in risk assessment API route:", error)
    return NextResponse.json(
      {
        error: "Failed to assess contract risk",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
