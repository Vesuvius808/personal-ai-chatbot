"use client"

import type React from "react"
import { useState, useEffect } from "react"
import ChatSidebar from "@/components/chat-sidebar"
import ChatInterface from "@/components/chat-interface"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Menu } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

// Define message type to match the backend
interface Message {
  role: "user" | "assistant" | "system"
  content: string
  metadata?: any
}

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedModel, setSelectedModel] = useState("o3-mini")
  const [selectedChat, setSelectedChat] = useState("new")

  // State for chat functionality
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // State for uploaded files
  const [files, setFiles] = useState<string[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  // State for chat history
  const [chatHistory, setChatHistory] = useState<Array<{ id: string; name: string }>>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const router = useRouter()

  // Fetch available files and chat history on component mount
  useEffect(() => {
    fetchFiles()
    fetchChatHistory()
  }, [])

  // Function to fetch chat history
  const fetchChatHistory = async () => {
    try {
      const response = await fetch("/api/chat-history")
      if (response.ok) {
        const data = await response.json()
        setChatHistory(
          data.chatHistory.map((chat: any) => ({
            id: chat.id,
            name: chat.name,
          })),
        )
      }
    } catch (error) {
      console.error("Error fetching chat history:", error)
    }
  }

  // Function to save the current chat
  const saveCurrentChat = async (chatIdToUpdate: string | null = null) => {
    if (messages.length === 0) return

    try {
      // Generate a chat name based on the first user message or use a default
      const firstUserMessage = messages.find((m) => m.role === "user")
      const chatName = firstUserMessage
        ? firstUserMessage.content.slice(0, 30) + (firstUserMessage.content.length > 30 ? "..." : "")
        : `Chat ${new Date().toLocaleString()}`

      // If we have a current chat ID, we're updating an existing chat
      const isUpdate = !!chatIdToUpdate || !!currentChatId
      const chatId = chatIdToUpdate || currentChatId || undefined

      const response = await fetch("/api/chat-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: chatId, // Pass the ID if updating an existing chat
          name: chatName,
          messages,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (!isUpdate) {
          setCurrentChatId(data.chat.id)
        }
        fetchChatHistory() // Refresh the chat history
      }
    } catch (error) {
      console.error("Error saving chat:", error)
    }
  }

  // Update the handleSelectChat function to better handle errors and check for data.chat

  // Function to handle chat selection
  const handleSelectChat = async (chatId: string) => {
    // Save current chat before switching to another one
    if (messages.length > 0 && currentChatId !== chatId) {
      await saveCurrentChat()
    }

    if (chatId === "new") {
      setMessages([])
      setCurrentChatId(null)
      setSelectedChat("new")
      return
    }

    try {
      // Fetch the selected chat
      const response = await fetch(`/api/chat-history?id=${chatId}`)

      if (!response.ok) {
        throw new Error(`Failed to load chat: ${response.status}`)
      }

      const data = await response.json()

      // Check if data.chat exists and has messages
      if (!data.chat || !Array.isArray(data.chat.messages)) {
        throw new Error("Invalid chat data received from server")
      }

      setMessages(data.chat.messages)
      setCurrentChatId(chatId)
      setSelectedChat(chatId)
    } catch (error) {
      console.error("Error loading chat:", error)
      // Show error to user
      setError(error instanceof Error ? error.message : "Failed to load chat")
      // If there's an error, create a new chat instead
      setMessages([])
      setCurrentChatId(null)
      setSelectedChat("new")
    }
  }

  // Function to delete a chat
  const handleDeleteChat = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chat-history?id=${chatId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        // If the deleted chat was the current one, create a new chat
        if (currentChatId === chatId) {
          setMessages([])
          setCurrentChatId(null)
          setSelectedChat("new")
        }

        // Refresh chat history
        fetchChatHistory()
      }
    } catch (error) {
      console.error("Error deleting chat:", error)
    }
  }

  const fetchFiles = async () => {
    try {
      const response = await fetch("/api/files")

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`)
      }

      const data = await response.json()
      // Extract filenames from file objects
      const fileNames = data.files ? data.files.map((file: any) => (typeof file === "string" ? file : file.name)) : []
      setFiles(fileNames)
    } catch (error) {
      console.error("Error fetching files:", error)
      setFiles([])
    }
  }

  // Modify the handleSubmit function to save chat after receiving a response
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() || isLoading) return

    // Check if this is a document query
    if (selectedFile) {
      await handleDocumentQuery()
      return
    }

    // Regular chat flow
    const userMessage: Message = { role: "user", content: input }
    setMessages((prev) => [...prev, userMessage])

    // Clear input and set loading state
    setInput("")
    setIsLoading(true)
    setError(null)

    try {
      // Call Next.js API route
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation_history: messages,
          user_input: input,
        }),
      })

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`)
      }

      const data = await response.json()
      console.log("API Response:", data)

      // Check if the response has the expected structure
      if (!data.conversation_history) {
        throw new Error("Invalid response format: missing conversation_history")
      }

      // Update messages with the new conversation history
      setMessages(data.conversation_history)

      // Save the chat to history
      // saveCurrentChat();
    } catch (error) {
      console.error("Error sending message:", error)
      // Add error message
      setError(error instanceof Error ? error.message : "Unknown error")
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, there was an error processing your request. Please try again.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleDocumentQuery = async () => {
    if (!selectedFile) return

    const userMessage: Message = {
      role: "user",
      content: input,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setError(null)

    try {
      // Call the chat-vectorstore endpoint
      const response = await fetch("/api/chat-vectorstore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vector_store_folder: selectedFile,
          conversation_history: messages,
          user_input: input,
          system_prompt: "You are a helpful assistant that answers questions based on the provided document.",
        }),
      })

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`)
      }

      const data = await response.json()

      // Check if the response has the expected structure
      if (!data.conversation_history) {
        throw new Error("Invalid response format: missing conversation_history")
      }

      // Update messages with the new conversation history
      setMessages(data.conversation_history)

      // Save the chat to history
      // saveCurrentChat();
    } catch (error) {
      console.error("Error querying document:", error)
      setError(error instanceof Error ? error.message : "Unknown error")
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, there was an error processing your document query. Please try again.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)

    // Check if the input starts with @ to select a file
    const match = e.target.value.match(/@(\S+)/)
    if (match && match[1]) {
      const filename = match[1]
      if (files.includes(filename)) {
        setSelectedFile(filename)
      }
    } else if (selectedFile && !e.target.value.includes(`@${selectedFile}`)) {
      // If the user removes the @document reference, clear the selected file
      setSelectedFile(null)
    }
  }

  const handleFileUpload = async () => {
    await fetchFiles()
  }

  // Update the chats array to use the actual chat history
  const chats = [{ id: "new", name: "New chat" }, ...chatHistory]

  // Better router events for App Router
  useEffect(() => {
    // Save chat when navigating away
    const handleBeforeUnload = () => {
      if (messages.length > 0) {
        saveCurrentChat()
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [messages, currentChatId])

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? "border-r border-border" : ""}`}>
        <ChatSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          chats={chats}
          selectedChat={selectedChat}
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChat}
          selectedModel={selectedModel}
          onSelectModel={setSelectedModel}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 h-full">
        {/* Top Bar */}
        <div className="flex items-center justify-between p-2 bg-card border-b border-border">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <span className="ml-2 text-sm font-medium">
              {selectedChat === "new"
                ? "New chat"
                : chatHistory.find((chat) => chat.id === selectedChat)?.name || "Chat"}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0-18 0"></path>
                <path d="M12 8v4l3 3"></path>
              </svg>
            </Button>
          </div>
        </div>

        {/* Chat Interface */}
        <ChatInterface
          messages={messages}
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
          selectedModel={selectedModel}
          availableFiles={files}
          onFileUpload={handleFileUpload}
          selectedFile={selectedFile}
        />

        {/* Error display for debugging */}
        {error && (
          <div className="p-2 bg-destructive/10 text-destructive text-xs border-t border-border">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>
    </div>
  )
}
