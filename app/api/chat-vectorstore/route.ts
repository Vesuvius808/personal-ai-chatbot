import { NextResponse } from "next/server"

// Get the base URL for the FastAPI backend from environment variables
const API_BASE_URL = process.env.API_URL || "http://184.94.212.47:8001"

export async function POST(req: Request) {
  try {
    // Parse the JSON body from the incoming request
    const body = await req.json()

    // Extract the vector store folder (filename) and user input
    const { filename, user_input, conversation_history } = body

    // Prepare the request for the RAG chat endpoint
    const ragRequest = {
      query: user_input,
      filename: filename, // This is now the base filename without extension
      k: 3, // Default to 3 chunks
    }

    console.log(`Sending RAG chat request for file: ${filename}, query: ${user_input}`)

    // Forward the request to the FastAPI backend
    const response = await fetch(`${API_BASE_URL}/rag_chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(ragRequest),
    })

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

      throw new Error(`Backend responded with status: ${response.status}, details: ${errorDetail}`)
    }

    // Check content type before parsing as JSON
    const contentType = response.headers.get("content-type")
    let data

    if (contentType && contentType.includes("application/json")) {
      data = await response.json()
    } else {
      // Handle non-JSON response
      const textResponse = await response.text()
      console.warn("Non-JSON response from backend:", textResponse)
      data = {
        content: `Error: Unexpected response format from server. Please try again.`,
        role: "assistant",
      }
    }

    // The backend returns { content, role, retrieved_chunks } for the AI's response
    if (data.content && data.role) {
      // Construct the updated conversation history
      const updatedHistory = [
        ...(conversation_history || []),
        { role: "user", content: user_input },
        {
          role: data.role,
          content: data.content,
          metadata: {
            retrieved_chunks: data.retrieved_chunks || [],
          },
        },
      ]

      // Return the updated conversation history to the frontend
      return NextResponse.json({ conversation_history: updatedHistory })
    } else {
      // Handle invalid response format from the backend
      console.error("Invalid response format from backend:", data)
      return NextResponse.json(
        {
          error: "Invalid response format from backend",
          conversation_history: [
            ...(conversation_history || []),
            { role: "user", content: user_input },
            {
              role: "assistant",
              content:
                "Sorry, there was an error processing your request. The backend returned an invalid response format.",
            },
          ],
        },
        { status: 500 },
      )
    }
  } catch (error) {
    // Handle any errors that occurred during the request
    console.error("Error in chat-vectorstore API route:", error)

    // Try to get the original request body for error handling
    let body
    try {
      body = await req.json()
    } catch (e) {
      body = { conversation_history: [], user_input: "" }
    }

    // Return an error response with the conversation history including an error message
    return NextResponse.json(
      {
        error: "Failed to process the chat request",
        details: error instanceof Error ? error.message : String(error),
        conversation_history: [
          ...(body?.conversation_history || []),
          { role: "user", content: body?.user_input || "" },
          { role: "assistant", content: "Sorry, there was an error processing your request. Please try again." },
        ],
      },
      { status: 500 },
    )
  }
}
