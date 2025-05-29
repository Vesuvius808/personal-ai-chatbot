import fs from "fs"
import path from "path"

// Define the chat history directory
const CHAT_HISTORY_DIR = path.join(process.cwd(), "Chat History")

// Define the chat interface
export interface ChatHistoryItem {
  id: string
  name: string
  messages: Array<{
    role: "user" | "assistant" | "system"
    content: string
    metadata?: any
  }>
  createdAt: string
  updatedAt: string
}

// Ensure the chat history directory exists
export function ensureChatHistoryDir() {
  if (!fs.existsSync(CHAT_HISTORY_DIR)) {
    fs.mkdirSync(CHAT_HISTORY_DIR, { recursive: true })
  }
}

// Get all chat history items
export function getChatHistory(): ChatHistoryItem[] {
  ensureChatHistoryDir()

  try {
    const files = fs.readdirSync(CHAT_HISTORY_DIR).filter((file) => file.endsWith(".json"))

    const chats = files.map((file) => {
      const filePath = path.join(CHAT_HISTORY_DIR, file)
      const content = fs.readFileSync(filePath, "utf-8")
      return JSON.parse(content) as ChatHistoryItem
    })

    // Sort by updatedAt (most recent first)
    return chats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  } catch (error) {
    console.error("Error reading chat history:", error)
    return []
  }
}

// Save a chat to history
export function saveChatToHistory(chat: ChatHistoryItem) {
  ensureChatHistoryDir()

  try {
    // Make sure we have required fields
    if (!chat.id || !chat.messages) {
      console.error("Invalid chat object - missing id or messages")
      return false
    }

    const filePath = path.join(CHAT_HISTORY_DIR, `${chat.id}.json`)

    // If the file exists, make sure we keep the creation date
    if (fs.existsSync(filePath)) {
      try {
        const existingChat = JSON.parse(fs.readFileSync(filePath, "utf-8"))
        // Preserve the original creation date
        chat.createdAt = existingChat.createdAt || chat.createdAt
      } catch (err) {
        // If we can't read the existing file, just continue
        console.warn(`Couldn't read existing chat file: ${filePath}`, err)
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(chat, null, 2), "utf-8")

    // Prune old chats if we have more than 30
    pruneOldChats()

    return true
  } catch (error) {
    console.error("Error saving chat to history:", error)
    return false
  }
}

// Delete a chat from history
export function deleteChatFromHistory(chatId: string) {
  ensureChatHistoryDir()

  try {
    const filePath = path.join(CHAT_HISTORY_DIR, `${chatId}.json`)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      return true
    }
    return false
  } catch (error) {
    console.error("Error deleting chat from history:", error)
    return false
  }
}

// Prune old chats to keep only the last 30
function pruneOldChats() {
  const chats = getChatHistory()

  if (chats.length > 30) {
    // Get the chats that need to be deleted (oldest first)
    const chatsToDelete = chats.slice(30)

    // Delete each chat
    chatsToDelete.forEach((chat) => {
      deleteChatFromHistory(chat.id)
    })
  }
}
