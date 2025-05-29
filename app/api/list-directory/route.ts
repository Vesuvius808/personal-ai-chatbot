import { NextResponse } from "next/server"

// Get the base URL for the FastAPI backend from environment variables
const API_BASE_URL = process.env.API_URL || "http://184.94.212.47:8001"

export async function GET(req: Request) {
  try {
    // Get the directory parameter from the URL
    const { searchParams } = new URL(req.url)
    const directory = searchParams.get("directory")

    if (!directory) {
      return NextResponse.json({ error: "Directory parameter is required" }, { status: 400 })
    }

    // Only allow specific directories for security
    const allowedDirectories = ["temp_files", "chunks", "vector_db"]
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
    const response = await fetch(`${API_BASE_URL}/list_dir/${directory}`, {
      method: "GET",
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error(`Error in list-directory API route:`, error)
    return NextResponse.json(
      { error: "Failed to list directory contents", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
