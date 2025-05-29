"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, FileText, Send, ChevronLeft, ChevronRight, Menu, AlertCircle, Database } from "lucide-react"
import Link from "next/link"

// Update the VectorizedFile interface to include the original filename
interface VectorizedFile {
  name: string
  type: string
  date: string
  baseName: string // Base name without extension
  originalName?: string // Original filename without .faiss extension
}

// Update the message interface to include the retrieved_chunks info
interface Message {
  role: "user" | "assistant" | "system"
  content: string
  metadata?: {
    retrieved_chunks?: Array<{
      chunk_id: number
      start_index: number
      end_index: number
    }>
  }
}

// Add a new interface for document chunks
interface DocumentChunk {
  chunk_id: number
  text: string // This will contain the content from the chunk
  metadata?: {
    start_index: number
    end_index: number
  }
}

export default function DeepSearchPage() {
  // Document state
  const [availableFiles, setAvailableFiles] = useState<VectorizedFile[]>([])
  const [currentDocument, setCurrentDocument] = useState<string | null>(null)
  const [retrievedChunks, setRetrievedChunks] = useState<DocumentChunk[]>([])
  const [isLoadingChunks, setIsLoadingChunks] = useState(false)
  const [chunkError, setChunkError] = useState<string | null>(null)
  const [documentContent, setDocumentContent] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isDocumentLoading, setIsDocumentLoading] = useState(false)
  const [isLoadingFiles, setIsLoadingFiles] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0)

  // Chat state
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const documentViewerRef = useRef<HTMLDivElement>(null)

  // Fetch available vectorized files on component mount
  useEffect(() => {
    fetchVectorizedFiles()
  }, [])

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Fetch the list of vectorized files
  const fetchVectorizedFiles = async () => {
    setIsLoadingFiles(true)
    setError(null)

    try {
      // Use the list-directory endpoint to get files directly from vector_db directory
      const response = await fetch("/api/list-directory?directory=vector_db")

      if (!response.ok) {
        throw new Error(`Failed to fetch vectorized files: ${response.status}`)
      }

      const data = await response.json()

      // Process the files from the vector_db directory
      const vectorFiles = data.files || []

      setAvailableFiles(
        vectorFiles.map((filename: string) => {
          // Extract the base name (without .faiss extension)
          const baseName = filename.replace(/\.faiss$/, "")

          return {
            name: filename,
            type: "FAISS",
            baseName: baseName, // Store the base filename (without extension)
            date: new Date().toISOString().split("T")[0], // Today's date as placeholder
          }
        }),
      )
    } catch (error) {
      console.error("Error fetching vectorized files:", error)
      setError("Could not load vectorized files. The backend server may be unavailable.")
      setAvailableFiles([])
    } finally {
      setIsLoadingFiles(false)
    }
  }

  // Add a new function to fetch specific chunks
  // Add this function after the fetchVectorizedFiles function

  // Function to fetch specific chunks based on the response from rag_chat
  const fetchSpecificChunks = async (filename: string, chunkIds: number[]) => {
    setIsLoadingChunks(true)
    setChunkError(null)

    try {
      // Prepare to collect all chunks
      const chunks: DocumentChunk[] = []

      // Get the base filename for the chunks JSON file
      const baseFilename = filename.endsWith(".faiss") ? filename.substring(0, filename.length - 6) : filename

      // The chunks filename should be in the format: baseFilename_chunks.json
      const chunksFilename = `${baseFilename}_chunks.json`

      // Fetch each chunk in parallel
      const chunkPromises = chunkIds.map(async (chunkId) => {
        const response = await fetch(
          `/api/get-specific-chunk?filename=${encodeURIComponent(chunksFilename)}&chunkId=${chunkId}`,
        )

        if (!response.ok) {
          throw new Error(`Failed to fetch chunk ${chunkId}: ${response.status}`)
        }

        return await response.json()
      })

      // Wait for all chunks to be fetched
      const fetchedChunks = await Promise.all(chunkPromises)

      // Add the fetched chunks to our collection
      fetchedChunks.forEach((chunk) => {
        chunks.push({
          chunk_id: chunk.chunk_id,
          text: chunk.content, // Use the content field from the chunk
          metadata: {
            start_index: chunk.start_index,
            end_index: chunk.end_index,
          },
        })
      })

      // Sort chunks by chunk_id to maintain order
      chunks.sort((a, b) => a.chunk_id - b.chunk_id)

      setRetrievedChunks(chunks)
      setCurrentChunkIndex(0)
    } catch (error) {
      console.error("Error fetching specific chunks:", error)
      setChunkError(error instanceof Error ? error.message : "Failed to fetch document chunks")
    } finally {
      setIsLoadingChunks(false)
    }
  }

  // Remove the loadMarkdownContent function completely
  // const loadMarkdownContent = async (baseName: string) => {
  //   // Remove this entire function
  // }

  // Add a function to load the markdown content
  const loadMarkdownContent = async (baseName: string) => {
    setIsDocumentLoading(true)
    setError(null)

    try {
      // Construct the markdown filename
      const markdownFilename = `${baseName}.md`

      // Fetch the markdown file content
      const response = await fetch(`/api/get-file?directory=md_folder&filename=${encodeURIComponent(markdownFilename)}`)

      if (!response.ok) {
        // If the markdown file doesn't exist, try to fetch from temp_files as fallback
        const fallbackResponse = await fetch(
          `/api/get-file?directory=temp_files&filename=${encodeURIComponent(baseName)}.pdf`,
        )

        if (!fallbackResponse.ok) {
          throw new Error(`Failed to load document content: ${response.status}`)
        }

        // For PDF files, we can't display the content directly, so show a placeholder
        setDocumentContent(
          `# ${baseName}\n\nThis is a PDF document. You can ask questions about its content using the chat interface.`,
        )
      } else {
        // Set the markdown content
        const content = await response.text()
        setDocumentContent(content)
      }

      setTotalPages(1) // Just one page for markdown
      setCurrentPage(1)
    } catch (error) {
      console.error("Error loading document content:", error)
      setError(error instanceof Error ? error.message : "Failed to load document content")

      // Set a placeholder content
      setDocumentContent(
        `# ${baseName}\n\nUnable to load document content. You can still ask questions about this document using the chat interface.`,
      )
    } finally {
      setIsDocumentLoading(false)
    }
  }

  // Update the loadDocument function to call loadMarkdownContent
  // const loadDocument = (file: VectorizedFile) => {
  //   // Set the current document name and base name
  //   setCurrentDocument(file.baseName)

  //   // Load the markdown content
  //   loadMarkdownContent(file.baseName)

  //   // Add system message
  //   setMessages([
  //     {
  //       role: "system",
  //       content: `Document "${file.name}" has been loaded. You can now ask questions about it.`,
  //     },
  //   ])
  // }

  // Replace with this simpler version:
  const loadDocument = (file: VectorizedFile) => {
    // Set the current document name
    setCurrentDocument(file.baseName)

    // Clear previous chunks
    setRetrievedChunks([])

    // Reset any errors
    setChunkError(null)

    // Add system message
    setMessages([
      {
        role: "system",
        content: `Document "${file.name}" has been selected. You can now ask questions about it.`,
      },
    ])
  }

  // Handle chat submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() || isLoading || !currentDocument) return

    const userMessage: Message = { role: "user", content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setError(null)

    try {
      // Call the rag_chat endpoint with the base filename
      const response = await fetch("/api/chat-vectorstore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: currentDocument, // This is now the base filename without extension
          user_input: input,
          conversation_history: messages.filter((m) => m.role !== "system"),
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
      setMessages((prev) => {
        // Keep the system message if it exists
        const systemMessage = prev.find((m: Message) => m.role === "system")
        const newHistory = data.conversation_history

        return systemMessage ? [systemMessage, ...newHistory.filter((m: Message) => m.role !== "system")] : newHistory
      })

      // Add new code to fetch specific chunks mentioned in the response
      // Extract chunk IDs from the assistant's response (the last message)
      const assistantMessage = data.conversation_history[data.conversation_history.length - 1]
      if (
        assistantMessage?.role === "assistant" &&
        assistantMessage?.metadata?.retrieved_chunks &&
        assistantMessage.metadata.retrieved_chunks.length > 0
      ) {
        // Extract chunk IDs
        const chunkIds = assistantMessage.metadata.retrieved_chunks.map((chunk: { chunk_id: number }) => chunk.chunk_id)

        // Fetch the specific chunks
        await fetchSpecificChunks(currentDocument, chunkIds)
      } else {
        // Clear retrieved chunks if none were returned
        setRetrievedChunks([])
      }
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

  // Navigation functions
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1)
    }
  }

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1)
    }
  }

  const prevChunk = () => {
    if (currentChunkIndex > 0) {
      setCurrentChunkIndex((prev) => prev - 1)
    }
  }

  const nextChunk = () => {
    if (currentChunkIndex < retrievedChunks.length - 1) {
      setCurrentChunkIndex((prev) => prev + 1)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <div className="border-b border-border p-3">
        <div className="px-4 md:px-6 lg:px-8">
          <div className="flex items-center">
            <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground -ml-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 m-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-foreground">{error}</p>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Document viewer */}
        <div className="w-1/2 border-r border-border flex flex-col">
          {/* Document toolbar */}
          <div className="bg-card border-b border-border p-2 flex items-center justify-between">
            <div className="flex items-center">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Menu className="h-4 w-4" />
              </Button>
              <span className="ml-2 text-sm truncate">
                {currentDocument ? currentDocument : "No document loaded"}
                {retrievedChunks.length > 0 && ` (${retrievedChunks.length} relevant sections)`}
              </span>
            </div>
            {retrievedChunks.length > 0 && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={prevChunk}
                  disabled={currentChunkIndex <= 0}
                  className="text-muted-foreground hover:text-foreground h-7 w-7 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">
                  {currentChunkIndex + 1} / {retrievedChunks.length}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={nextChunk}
                  disabled={currentChunkIndex >= retrievedChunks.length - 1}
                  className="text-muted-foreground hover:text-foreground h-7 w-7 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Document content */}
          <div className="flex-1 overflow-y-auto bg-background p-6" style={{ maxHeight: "calc(100vh - 120px)" }}>
            {isDocumentLoading || isLoadingChunks ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
              </div>
            ) : !currentDocument ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Database className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No document loaded</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Select a vectorized document from the list to start analyzing it.
                </p>

                <div className="mt-8 w-full max-w-md">
                  <h4 className="text-sm font-medium mb-3 text-left">FAISS Vector Files</h4>

                  {isLoadingFiles ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground"></div>
                    </div>
                  ) : availableFiles.length > 0 ? (
                    <div className="space-y-2">
                      {availableFiles.map((file, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          className="w-full justify-start bg-muted border-border hover:bg-muted/80 group transition-all duration-300 text-left"
                          onClick={() => loadDocument(file)}
                        >
                          <FileText className="h-4 w-4 mr-2 text-foreground group-hover:text-foreground/90" />
                          <span className="truncate group-hover:text-foreground/90">{file.name}</span>
                          <div className="absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">No vectorized FAISS files available.</p>
                      <p className="text-muted-foreground mt-2">
                        Please upload and vectorize documents in the Knowledge Base first.
                      </p>
                      <Link href="/knowledge-base" className="mt-4 inline-block">
                        <Button
                          variant="outline"
                          className="justify-start bg-muted border-border hover:bg-muted/80 group transition-all duration-300"
                        >
                          <span className="group-hover:text-foreground/90">Go to Knowledge Base</span>
                          <div className="absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ) : retrievedChunks.length === 0 ? (
              <div className="bg-card text-foreground rounded-lg shadow-sm p-6 h-full flex flex-col items-center justify-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2 text-foreground">Document Selected</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Ask a question about <strong>{currentDocument}</strong> to see relevant sections from the document.
                </p>
                {chunkError && (
                  <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm">
                    <p>
                      <strong>Error:</strong> {chunkError}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div
                ref={documentViewerRef}
                className="prose prose-invert max-w-none overflow-y-auto"
                style={{
                  backgroundColor: "hsl(var(--card))",
                  color: "hsl(var(--foreground))",
                  padding: "2rem",
                  minHeight: "100%",
                  boxShadow: "0 0 10px rgba(0, 0, 0, 0.1)",
                  borderRadius: "8px",
                }}
              >
                <h2 className="text-xl font-bold mt-0 mb-6 text-foreground border-b border-border pb-2">
                  Relevant sections from {currentDocument}
                </h2>

                {retrievedChunks.length > 0 && retrievedChunks[currentChunkIndex] && (
                  <div
                    key={retrievedChunks[currentChunkIndex].chunk_id}
                    className="mb-6 p-4 rounded border-l-4 border-border"
                    style={{ backgroundColor: "hsl(var(--muted))" }}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Chunk #{retrievedChunks[currentChunkIndex].chunk_id}
                      </span>
                    </div>
                    <div className="text-foreground whitespace-pre-wrap">{retrievedChunks[currentChunkIndex].text}</div>
                  </div>
                )}

                {chunkError && (
                  <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm">
                    <p>
                      <strong>Error:</strong> {chunkError}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chat interface */}
        <div className="w-1/2 flex flex-col h-[calc(100vh-56px)] overflow-hidden bg-card">
          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-8 min-h-0">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <h2 className="text-2xl font-bold mb-2">Ask questions about your document</h2>
                  <p className="text-muted-foreground">
                    {currentDocument
                      ? "You can now ask questions about this document."
                      : "Select a vectorized document first, then ask questions about its content."}
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message: Message, index) => (
                <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[90%] rounded-2xl px-4 py-0.5 text-foreground ${
                      message.role === "user" ? "bg-muted" : message.role === "system" ? "bg-muted/50" : ""
                    }`}
                  >
                    {/* AI icon removed */}
                    <div className="prose prose-invert max-w-none markdown-content">
                      <p className="mt-4 mb-4 leading-relaxed text-foreground break-words">{message.content}</p>
                    </div>

                    {/* Display metadata about retrieved chunks if available */}
                    {message.metadata?.retrieved_chunks && message.metadata.retrieved_chunks.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
                        <p>Retrieved from {message.metadata.retrieved_chunks.length} document sections</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[90%] rounded-2xl px-4 py-0.5 text-foreground">
                  <div className="prose prose-invert max-w-none markdown-content">
                    <p className="mt-4 mb-4 leading-relaxed text-foreground break-words">Thinking...</p>
                  </div>
                </div>
              </div>
            )}

            {/* Reference for auto-scrolling */}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="p-4 bg-card flex-shrink-0 border-t border-border">
            <form onSubmit={handleSubmit} className="relative max-w-3xl mx-auto">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={currentDocument ? `Ask about ${currentDocument}...` : "Select a document first..."}
                className="w-full pr-24 pl-4 py-3 bg-muted border-0 rounded-lg resize-none overflow-hidden max-h-32"
                rows={1}
                disabled={!currentDocument}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    if (input.trim() && currentDocument) {
                      handleSubmit(e as unknown as React.FormEvent)
                    }
                  }
                }}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading || !currentDocument}
                className="absolute right-2 bottom-2 h-8 w-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <div className="mt-2 text-xs text-muted-foreground text-center max-w-3xl mx-auto">
              {currentDocument
                ? "Ask specific questions about the document content"
                : "Select a vectorized document to start the conversation"}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
