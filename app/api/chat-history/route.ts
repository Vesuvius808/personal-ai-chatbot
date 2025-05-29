import { NextResponse } from "next/server"
import { getChatHistory, saveChatToHistory, deleteChatFromHistory } from "@/utils/chat-history"
import { v4 as uuidv4 } from "uuid"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const chatId = searchParams.get("id")

    // If a specific chat ID is provided, return just that chat
    if (chatId) {
      const allChats = getChatHistory()
      const chat = allChats.find((chat) => chat.id === chatId)

      if (!chat) {
        return NextResponse.json({ error: "Chat not found" }, { status: 404 })
      }

      return NextResponse.json({ chat })
    }

    // Otherwise return all chats
    const chatHistory = getChatHistory()
    return NextResponse.json({ chatHistory })
  } catch (error) {
    console.error("Error getting chat history:", error)
    return NextResponse.json({ error: "Failed to get chat history", chatHistory: [] }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { id, name, messages } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 })
    }

    const now = new Date().toISOString()

    // If an ID is provided, update the existing chat
    if (id) {
      // Get existing chats
      const chats = getChatHistory()

      // Find the existing chat
      const existingChat = chats.find((chat) => chat.id === id)

      if (existingChat) {
        // Update the existing chat
        const updatedChat = {
          ...existingChat,
          name: name || existingChat.name,
          messages,
          updatedAt: now,
        }

        saveChatToHistory(updatedChat)
        return NextResponse.json({ success: true, chat: updatedChat })
      }
    }

    // If no ID or no existing chat found, create a new one
    const chatItem = {
      id: id || uuidv4(),
      name: name || `Chat ${now.split("T")[0]}`,
      messages,
      createdAt: now,
      updatedAt: now,
    }

    saveChatToHistory(chatItem)
    return NextResponse.json({ success: true, chat: chatItem })
  } catch (error) {
    console.error("Error saving chat history:", error)
    return NextResponse.json({ error: "Failed to save chat history" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const chatId = searchParams.get("id")

    if (!chatId) {
      return NextResponse.json({ error: "Chat ID is required" }, { status: 400 })
    }

    const success = deleteChatFromHistory(chatId)
    return NextResponse.json({ success })
  } catch (error) {
    console.error("Error deleting chat history:", error)
    return NextResponse.json({ error: "Failed to delete chat history" }, { status: 500 })
  }
}
