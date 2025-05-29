import { NextResponse } from "next/server"

// Get the base URL for the FastAPI backend from environment variables
const API_BASE_URL = process.env.API_URL || "http://184.94.212.47:8001"

export async function POST(req: Request) {
  try {
    // Extract the form data from the request
    const formData = await req.formData()

    // Get the file from the form data
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Create a new FormData object to send to the backend
    const backendFormData = new FormData()
    backendFormData.append("file", file)

    // Forward the request to the FastAPI backend
    console.log(`Uploading file ${file.name} to ${API_BASE_URL}/upload`)
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: "POST",
      body: backendFormData,
    })

    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.status}`)
    }

    const data = await response.json()
    console.log(`File ${file.name} uploaded successfully`)

    // Process the document for RAG after successful upload
    try {
      console.log(
        `Processing file ${file.name} for RAG at ${API_BASE_URL}/process_document_rag/${encodeURIComponent(file.name)}`,
      )
      const processResponse = await fetch(`${API_BASE_URL}/process_document_rag/${encodeURIComponent(file.name)}`, {
        method: "POST",
      })

      // Check if the response is successful
      if (!processResponse.ok) {
        // Get the response as text first
        const errorText = await processResponse.text()
        console.error(`RAG processing failed with status: ${processResponse.status}`, errorText)

        // Return a structured error response
        return NextResponse.json({
          success: true,
          message: `File ${file.name} uploaded successfully but RAG processing failed`,
          filename: file.name,
          ...data,
          processingError: errorText,
        })
      }

      // Try to parse the successful response as JSON
      let processData
      try {
        const contentType = processResponse.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          processData = await processResponse.json()
        } else {
          // Handle non-JSON successful responses
          const responseText = await processResponse.text()
          processData = { message: responseText }
        }
      } catch (parseError) {
        console.warn("Could not parse RAG processing response as JSON:", parseError)
        processData = { message: "Processing completed but returned non-JSON response" }
      }

      console.log(`File ${file.name} processed for RAG successfully:`, processData)

      // Add processing info to the response
      return NextResponse.json({
        success: true,
        message: `File ${file.name} uploaded successfully and processed for RAG`,
        filename: file.name,
        ...data,
        processing: processData,
      })
    } catch (processError) {
      console.error(`Error during RAG processing for ${file.name}:`, processError)
      return NextResponse.json({
        success: true,
        message: `File ${file.name} uploaded successfully but RAG processing failed`,
        filename: file.name,
        ...data,
        processError: processError instanceof Error ? processError.message : String(processError),
      })
    }
  } catch (error) {
    console.error("Error in upload API route:", error)
    return NextResponse.json(
      {
        error: "Failed to upload file",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
