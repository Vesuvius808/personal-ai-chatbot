import { NextResponse } from "next/server"

// Get the base URL for the FastAPI backend from environment variables
const API_BASE_URL = process.env.API_URL || "http://184.94.212.47:8001"

export async function GET(req: Request) {
  try {
    // Try to fetch files from the backend
    let files = []

    try {
      // Add a timeout to the fetch request
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000) // 20 second timeout

      const response = await fetch(`${API_BASE_URL}/files`, {
        method: "GET",
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.warn(`Backend responded with status: ${response.status}`)
        // Continue with empty files array
      } else {
        const data = await response.json()
        files = data.files || []
      }
    } catch (fetchError) {
      console.warn("Error fetching from backend:", fetchError)
      // Continue with empty files array - we'll handle this gracefully
    }

    // Transform the data to match the expected format by the frontend
    const formattedFiles = files.map((filename: string) => {
      // Extract file extension
      const extension = filename.split(".").pop()?.toLowerCase() || ""

      // Determine file type and category
      const type = extension.toUpperCase()
      let category = "unknown"

      if (extension === "pdf") {
        category = "pdf"
      } else if (["md", "markdown", "txt"].includes(extension)) {
        category = "markdown"
      } else if (extension === "vec" || filename.includes("vector")) {
        category = "vector"
      }

      // Generate a simple ID
      const id = `file_${Math.random().toString(36).substring(2, 11)}`

      return {
        id,
        name: filename,
        size: 0.5, // Placeholder size in MB
        date: new Date().toISOString().split("T")[0], // Today's date
        type,
        category,
      }
    })

    return NextResponse.json({ files: formattedFiles })
  } catch (error) {
    console.error("Error in files API route:", error)
    // Return an empty array instead of an error to prevent breaking the UI
    return NextResponse.json({ files: [] })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const filename = searchParams.get("filename")

    if (!filename) {
      return NextResponse.json({ error: "Filename is required" }, { status: 400 })
    }

    try {
      // Forward the request to the FastAPI backend
      const response = await fetch(`${API_BASE_URL}/files/${encodeURIComponent(filename)}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        console.warn(`Delete failed with status: ${response.status}`)
        return NextResponse.json({
          success: false,
          message: `Failed to delete file on the server, but it will be removed from the UI.`,
        })
      }

      const data = await response.json()
      return NextResponse.json(data)
    } catch (fetchError) {
      console.warn("Error connecting to backend for delete:", fetchError)
      // Return success anyway to allow UI to update
      return NextResponse.json({
        success: true,
        message: "File removed from UI, but backend may not be updated.",
      })
    }
  } catch (error) {
    console.error("Error in delete file API route:", error)
    return NextResponse.json({ error: "Failed to delete file" }, { status: 500 })
  }
}
