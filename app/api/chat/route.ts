import { NextResponse } from "next/server"

// Get the base URL for the FastAPI backend from environment variables
const API_BASE_URL = process.env.API_URL || "http://184.94.212.47:8001"

export async function POST(req: Request) {
  try {
    // Parse the JSON body from the incoming request
    const body = await req.json()

    // Forward the request to the FastAPI backend
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`)
    }

    const data = await response.json()

    // The backend returns { content, role } for the AI's response
    if (data.content && data.role) {
      // Construct the updated conversation history
      const updatedHistory = [
        ...(body.conversation_history || []),
        { role: "user", content: body.user_input },
        { role: data.role, content: data.content },
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
            ...(body.conversation_history || []),
            { role: "user", content: body.user_input },
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
    console.error("Error in chat API route:", error)

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
