import { NextResponse } from "next/server"

// Get the base URL for the FastAPI backend from environment variables
const API_BASE_URL = process.env.API_URL || "http://184.94.212.47:8001"

export async function GET(req: Request) {
  try {
    // Get the filename and chunk_id parameters from the URL
    const { searchParams } = new URL(req.url)
    const filename = searchParams.get("filename")
    const chunkId = searchParams.get("chunkId")

    if (!filename || !chunkId) {
      return NextResponse.json({ error: "Filename and chunkId parameters are required" }, { status: 400 })
    }

    // Make sure chunkId is a valid number
    const chunkIdNum = Number.parseInt(chunkId, 10)
    if (isNaN(chunkIdNum)) {
      return NextResponse.json({ error: "chunkId must be a valid number" }, { status: 400 })
    }

    // Add a timeout to the fetch request
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000) // 20 second timeout

    // Call the backend endpoint
    const response = await fetch(`${API_BASE_URL}/get_specific_chunk/${encodeURIComponent(filename)}/${chunkIdNum}`, {
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
    console.error(`Error in get-specific-chunk API route:`, error)
    return NextResponse.json(
      { error: "Failed to get chunk", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
