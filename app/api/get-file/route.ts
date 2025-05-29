import { NextResponse } from "next/server"

// Get the base URL for the FastAPI backend from environment variables
const API_BASE_URL = process.env.API_URL || "http://184.94.212.47:8001"

export async function GET(req: Request) {
  try {
    // Get the directory and filename parameters from the URL
    const { searchParams } = new URL(req.url)
    const directory = searchParams.get("directory")
    const filename = searchParams.get("filename")

    if (!directory || !filename) {
      return NextResponse.json({ error: "Directory and filename parameters are required" }, { status: 400 })
    }

    // Only allow specific directories for security
    const allowedDirectories = ["temp_files", "chunks", "vector_db", "md_folder"]
    if (!allowedDirectories.includes(directory)) {
      return NextResponse.json(
        { error: `Directory '${directory}' is not allowed. Allowed directories: ${allowedDirectories.join(", ")}` },
        { status: 400 },
      )
    }

    // Add a timeout to the fetch request
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000) // 20 second timeout

    // Call the backend endpoint
    const response = await fetch(`${API_BASE_URL}/get_file/${directory}/${encodeURIComponent(filename)}`, {
      method: "GET",
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }

    // Get the content type from the response
    const contentType = response.headers.get("content-type")

    // If it's a text file, return the text content
    if (contentType && (contentType.includes("text") || contentType.includes("application/json"))) {
      const text = await response.text()
      return new NextResponse(text, {
        headers: {
          "Content-Type": contentType,
        },
      })
    }

    // For binary files, return the blob
    const blob = await response.blob()
    return new NextResponse(blob, {
      headers: {
        "Content-Type": contentType || "application/octet-stream",
      },
    })
  } catch (error) {
    console.error(`Error in get-file API route:`, error)
    return NextResponse.json(
      { error: "Failed to get file", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
