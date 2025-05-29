"use client"

import type React from "react"
import { type FormEvent, useRef, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Paperclip, FileText, Upload, Copy, Check, Database } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import Link from "next/link"

// Define the structure of a message
interface Message {
  role: "user" | "assistant" | "system"
  content: string
}

// Define the props for the ChatInterface component
interface ChatInterfaceProps {
  messages: Message[] // All messages in the conversation
  input: string // Current user input
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void // Input change handler
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void // Form submission handler
  isLoading: boolean // Loading state
  selectedModel: string // Selected AI model
  availableFiles: Array<string | { name: string }> // Available document files
  onFileUpload: () => void // File upload handler
  selectedFile: string | null // Currently selected file
  onConversationEnd?: () => void // Callback when conversation ends
}

export default function ChatInterface({
  messages,
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  selectedModel,
  availableFiles,
  onFileUpload,
  selectedFile,
  onConversationEnd,
}: ChatInterfaceProps) {
  // State to handle client-side rendering
  const [mounted, setMounted] = useState(false)

  // Set mounted to true after component mounts (client-side)
  useEffect(() => {
    setMounted(true)
  }, [])

  // References to DOM elements
  const messagesEndRef = useRef<HTMLDivElement>(null) // For auto-scrolling
  const textareaRef = useRef<HTMLTextAreaElement>(null) // For input field
  const fileInputRef = useRef<HTMLInputElement>(null) // For file input

  // State for file upload functionality
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // State for vector files
  const [vectorFiles, setVectorFiles] = useState<string[]>([])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [input])

  // Reset copied code state after 2 seconds
  useEffect(() => {
    if (copiedCode) {
      const timer = setTimeout(() => {
        setCopiedCode(null)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [copiedCode])

  // Fetch vector files when component mounts
  useEffect(() => {
    fetchVectorFiles()
  }, [])

  // Function to fetch vector files from the vector_db directory
  const fetchVectorFiles = async () => {
    try {
      console.log("Fetching vector files...")
      // Use the Next.js API route instead of direct backend access
      const response = await fetch("/api/list-directory?directory=vector_db", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        console.error(`Failed to fetch vector files: ${response.status}`)
        return
      }

      const data = await response.json()
      console.log("Vector files API response:", data)

      // Extract filenames from the response
      const files = data.files || []

      // Transform filenames (remove .faiss extension if present)
      const transformedFiles = files.map((filename: string) => {
        return filename.replace(/\.faiss$/, "")
      })

      setVectorFiles(transformedFiles)
      console.log("Vector files loaded:", transformedFiles)
    } catch (error) {
      console.error("Error fetching vector files:", error)
    }
  }

  // Function to copy code to clipboard
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
  }

  // Function to insert a document reference into the input
  const insertDocumentReference = (docName: string) => {
    if (textareaRef.current) {
      const cursorPos = textareaRef.current.selectionStart
      const textBefore = input.substring(0, cursorPos)
      const textAfter = input.substring(cursorPos)

      // Check if we're already starting with @
      const newValue = textBefore.endsWith("@")
        ? `${textBefore.slice(0, -1)}@${docName} ${textAfter}`
        : `${textBefore}@${docName} ${textAfter}`

      // Create a synthetic event to update the input value
      const event = {
        target: { value: newValue },
      } as React.ChangeEvent<HTMLTextAreaElement>

      handleInputChange(event)

      // Focus back on textarea after selection
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          const newCursorPos = textBefore.endsWith("@")
            ? cursorPos + docName.length + 1
            : cursorPos + docName.length + 2
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newCursorPos
        }
      }, 0)
    }
  }

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0])
    }
  }

  // Handle file upload to the backend
  const handleFileUpload = async () => {
    if (!uploadedFile) return

    setUploadStatus("uploading")

    const formData = new FormData()
    formData.append("file", uploadedFile)

    try {
      // Call the upload API route
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`)
      }

      setUploadStatus("success")
      onFileUpload() // Refresh the file list

      // Reset after a delay
      setTimeout(() => {
        setUploadStatus("idle")
        setUploadedFile(null)
        setIsFileDialogOpen(false)
      }, 2000)
    } catch (error) {
      console.error("Error uploading file:", error)
      setUploadStatus("error")
    }
  }

  // Custom renderer for code blocks in markdown
  const CodeRenderer = ({ node, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || "")
    const code = String(children).replace(/\n$/, "")
    const isInline = !match

    if (!isInline) {
      return (
        <div className="mt-0 mb-4">
          <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground bg-muted border-b border-border rounded-t-md">
            <span>{match ? match[1] : "code"}</span>
            <button
              onClick={() => handleCopyCode(code)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {copiedCode === code ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy code</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-4 overflow-x-auto text-sm bg-card rounded-b-md code-block-content">
            <code className={`language-${match ? match[1] : "text"}`}>{code}</code>
          </pre>
        </div>
      )
    }

    // For inline code
    return (
      <code className="px-1.5 py-0.5 mx-0.5 rounded text-sm font-mono bg-muted" {...props}>
        {children}
      </code>
    )
  }

  // Add this function before the return statement
  const handlePopoverOpen = () => {
    console.log("Popover opened, vector files:", vectorFiles)
    // Refresh the vector files list when popover is opened
    fetchVectorFiles()
  }

  // Add this effect after the other useEffect hooks
  useEffect(() => {
    // Fetch vector files when component mounts
    fetchVectorFiles()

    // Also set up an event listener to close the dialog
    const handleCloseDialog = () => {
      const dialogElement = document.querySelector('[role="dialog"]')
      if (dialogElement) {
        // Find the close button and click it
        const closeButton = dialogElement.querySelector('button[aria-label="Close"]')
        if (closeButton) {
          ;(closeButton as HTMLButtonElement).click()
        }
      }
    }

    document.addEventListener("close-dialog", handleCloseDialog)

    return () => {
      document.removeEventListener("close-dialog", handleCloseDialog)
    }
  }, [])

  // Main component render
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Messages Area - This displays all the messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-8 bg-card">
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 ? (
            // Empty state when no messages
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <h2 className="text-2xl font-bold mb-2"></h2>
                <p className="text-muted-foreground"></p>
              </div>
            </div>
          ) : (
            // Map through and display all messages
            messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[90%] rounded-2xl px-4 py-0.5 text-foreground ${
                    message.role === "user" ? "bg-muted" : ""
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex items-center mb-2">
                      {selectedFile && (
                        <span className="text-xs bg-primary/20 px-2 py-0.5 rounded-full text-primary">
                          Using {selectedFile}
                        </span>
                      )}
                    </div>
                  )}
                  {/* Render markdown content */}
                  <div className="prose prose-invert max-w-none markdown-content">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code: CodeRenderer,
                        h1: (props) => <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />,
                        h2: (props) => <h2 className="text-xl font-bold mt-5 mb-3" {...props} />,
                        h3: (props) => <h3 className="text-lg font-bold mt-4 mb-2" {...props} />,
                        h4: (props) => <h4 className="text-base font-bold mt-3 mb-2" {...props} />,
                        h5: (props) => <h5 className="text-sm font-bold mt-3 mb-1" {...props} />,
                        h6: (props) => <h6 className="text-xs font-bold mt-3 mb-1" {...props} />,
                        p: (props) => (
                          <p className="mt-4 mb-4 leading-relaxed text-foreground break-words" {...props} />
                        ),
                        ul: (props) => <ul className="list-disc pl-6 mb-4 space-y-1" {...props} />,
                        ol: (props) => <ol className="list-decimal pl-6 mb-4 space-y-1" {...props} />,
                        li: (props) => <li className="mb-1" {...props} />,
                        blockquote: (props) => (
                          <blockquote
                            className="border-l-4 border-border pl-4 py-1 my-4 bg-muted rounded-r-md"
                            {...props}
                          />
                        ),
                        a: (props) => (
                          <a
                            className="text-primary hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                            {...props}
                          />
                        ),
                        table: (props) => (
                          <div className="overflow-x-auto my-4">
                            <table className="min-w-full border border-border rounded-md" {...props} />
                          </div>
                        ),
                        thead: (props) => <thead className="bg-muted" {...props} />,
                        th: (props) => <th className="px-4 py-2 border-b border-border text-left" {...props} />,
                        td: (props) => <td className="px-4 py-2 border-b border-border" {...props} />,
                        hr: (props) => <hr className="my-6 border-border" {...props} />,
                        img: (props) => (
                          <img className="max-w-full h-auto rounded-md my-4" {...props} alt={props.alt || ""} />
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="max-w-3xl mx-auto">
            <div className="flex justify-start">
              <div className={`max-w-[90%] rounded-2xl px-4 py-0.5 text-foreground`}>
                <div className="prose prose-invert max-w-none markdown-content">
                  <p className="mt-4 mb-4 leading-relaxed text-foreground break-words">Thinking...</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto">
          {/* Reference for auto-scrolling */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area - This is where users type messages */}
      <div className="p-4 bg-card border-t border-border">
        <form onSubmit={handleSubmit} className="relative max-w-3xl mx-auto">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            placeholder={selectedFile ? `Ask about ${selectedFile}...` : "Message PersonalAI..."}
            className={`w-full pr-24 pl-4 py-3 bg-muted border-0 rounded-lg resize-none overflow-hidden max-h-32 ${
              selectedFile ? "border-l-4 border-l-primary" : ""
            }`}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                if (input.trim()) {
                  handleSubmit(e as unknown as FormEvent<HTMLFormElement>)
                }
              }
            }}
          />

          {/* Action buttons */}
          <div className="absolute right-2 bottom-2 flex items-center space-x-1">
            {/* File upload dialog */}
            <Dialog open={isFileDialogOpen} onOpenChange={setIsFileDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle>Upload Document</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                    <input
                      type="file"
                      id="file-upload"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".pdf,.md,.txt,.docx"
                    />
                    <label htmlFor="file-upload" className="flex flex-col items-center justify-center cursor-pointer">
                      {uploadedFile ? (
                        <>
                          <FileText className="h-12 w-12 text-primary mb-3" />
                          <span className="text-lg font-medium">{uploadedFile.name}</span>
                          <span className="text-sm text-muted-foreground mt-1">
                            {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-12 w-12 text-muted-foreground mb-3" />
                          <span className="text-lg font-medium">Click to upload a document</span>
                          <span className="text-sm text-muted-foreground mt-1">PDF, Markdown, TXT, or DOCX</span>
                        </>
                      )}
                    </label>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      className="bg-primary hover:bg-primary/90"
                      disabled={!uploadedFile || uploadStatus === "uploading"}
                      onClick={handleFileUpload}
                    >
                      {uploadStatus === "uploading" ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Uploading...
                        </>
                      ) : uploadStatus === "success" ? (
                        "Uploaded Successfully!"
                      ) : uploadStatus === "error" ? (
                        "Upload Failed - Try Again"
                      ) : (
                        "Upload Document"
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Document reference dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <Database className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle>FAISS Vector Files</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="max-h-60 overflow-y-auto">
                    {vectorFiles.length > 0 ? (
                      vectorFiles.map((filename, index) => (
                        <Button
                          key={index}
                          variant="ghost"
                          className="w-full justify-start text-sm text-muted-foreground hover:bg-muted px-2 py-1.5 mb-1"
                          onClick={() => {
                            insertDocumentReference(filename)
                            // Close the dialog after selection
                            const closeEvent = new Event("close-dialog")
                            document.dispatchEvent(closeEvent)
                          }}
                        >
                          <Database className="h-4 w-4 mr-2 text-primary" />
                          {filename}
                        </Button>
                      ))
                    ) : (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        No vector files available.
                        <Link href="/knowledge-base" className="block mt-2 text-primary hover:underline">
                          Add files in Knowledge Base
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Send button */}
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="h-8 w-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
