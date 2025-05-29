"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Upload,
  FileText,
  ArrowLeft,
  Trash2,
  Search,
  Book,
  Plus,
  Database,
  FileCode,
  FileIcon as FilePdf,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"

// Define file types
type FileType = "pdf" | "markdown" | "vector" | "all"

// Define file structure
interface FileItem {
  id: string
  name: string
  size: number
  date: string
  type: string
  category: FileType
}

export default function KnowledgeBasePage() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isVectorizing, setIsVectorizing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [documents, setDocuments] = useState<FileItem[]>([])
  const [activeTab, setActiveTab] = useState("pdf")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [vectorizedFiles, setVectorizedFiles] = useState<FileItem[]>([])

  // Fetch documents on component mount
  useEffect(() => {
    fetchDocuments()
    fetchVectorizedFiles() // Add this line
  }, [])

  // Fetch documents from the backend
  const fetchDocuments = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/files")

      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.status}`)
      }

      const data = await response.json()

      // Transform the data to include category
      const transformedData: FileItem[] = (data.files || []).map((file: any) => {
        // Get the file name and determine if it's a .faiss file
        const name = typeof file === "string" ? file : file.name
        const extension = name.split(".").pop()?.toLowerCase()

        // Determine category based on file extension
        let category: FileType = "all"

        if (extension === "pdf") {
          category = "pdf"
        } else if (["md", "markdown", "txt"].includes(extension || "")) {
          category = "markdown"
        } else if (extension === "faiss" || name.endsWith(".faiss")) {
          category = "vector"
        }

        return {
          ...file,
          name,
          category,
          id: `file_${Math.random().toString(36).substring(2, 11)}`, // Generate a simple ID if not present
          size: file.size || 0.5, // Use existing size or placeholder
          date: file.date || new Date().toISOString().split("T")[0], // Use existing date or today
          type: extension?.toUpperCase() || "UNKNOWN",
        }
      })

      setDocuments(transformedData)
    } catch (error) {
      console.error("Error fetching documents:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch documents")
      // Use empty array if fetch fails
      setDocuments([])
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch vectorized files from the vector_db directory
  const fetchVectorizedFiles = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/list-directory?directory=vector_db")

      if (!response.ok) {
        throw new Error(`Failed to fetch vectorized files: ${response.status}`)
      }

      const data = await response.json()

      // Transform the data to include category
      const transformedData: FileItem[] = (data.files || []).map((fileName: string) => {
        return {
          id: `file_${Math.random().toString(36).substring(2, 11)}`,
          name: fileName,
          size: 0.5, // Placeholder size
          date: new Date().toISOString().split("T")[0], // Today's date as placeholder
          type: "FAISS",
          category: "vector",
        }
      })

      setVectorizedFiles(transformedData)
    } catch (error) {
      console.error("Error fetching vectorized files:", error)
      // Don't set error state here to avoid showing error message
      setVectorizedFiles([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setIsUploading(true)
    setStatusMessage("Uploading file...")
    setError(null)

    try {
      // Create a FormData object to send the file
      const formData = new FormData()
      formData.append("file", file)

      // Call our Next.js API route
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        let errorMessage = `Upload failed with status: ${response.status}`

        try {
          const errorData = await response.json()
          if (errorData.details) {
            errorMessage += `. ${errorData.details}`
          }
        } catch (e) {
          // If response is not JSON, try to get text
          try {
            const errorText = await response.text()
            errorMessage += `. ${errorText}`
          } catch (e2) {
            // If we can't get text either, just use the status
          }
        }

        throw new Error(errorMessage)
      }

      const data = await response.json()

      // Check if there was a processing error
      if (data.processError) {
        setStatusMessage(`File uploaded successfully, but vectorization failed.`)
        setError(`Vectorization error: ${data.processError}`)
      } else if (data.processingError) {
        setStatusMessage(`File uploaded successfully, but vectorization failed.`)
        setError(`Vectorization error: ${data.processingError}`)
      } else if (data.processing) {
        setStatusMessage(`File uploaded and vectorized successfully!`)
      } else {
        setStatusMessage(`File uploaded successfully!`)
      }

      // Refresh the document list
      await fetchDocuments()

      // Reset the file input
      setFile(null)

      // Switch to the appropriate tab based on file type
      const extension = file.name.split(".").pop()?.toLowerCase()
      if (extension === "pdf") {
        setActiveTab("pdf")
      } else if (["md", "markdown", "txt"].includes(extension || "")) {
        setActiveTab("markdown")
      }

      // Clear status message after a delay
      setTimeout(() => {
        setStatusMessage(null)
      }, 5000)
    } catch (error) {
      console.error("Error uploading file:", error)
      setError(error instanceof Error ? error.message : "Failed to upload file")
      setStatusMessage(null)
    } finally {
      setIsUploading(false)
      setIsVectorizing(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const fileToDelete = documents.find((doc) => doc.id === id)
      if (!fileToDelete) return

      const response = await fetch(`/api/files?filename=${encodeURIComponent(fileToDelete.name)}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`Delete failed with status: ${response.status}`)
      }

      // Update the documents list
      setDocuments(documents.filter((doc) => doc.id !== id))
      setStatusMessage(`File ${fileToDelete.name} deleted successfully.`)

      // Clear status message after a delay
      setTimeout(() => {
        setStatusMessage(null)
      }, 3000)
    } catch (error) {
      console.error("Error deleting file:", error)
      setError(error instanceof Error ? error.message : "Failed to delete file")
    }
  }

  // Add a function to manually vectorize a file
  const handleVectorize = async (filename: string) => {
    setIsVectorizing(true)
    setStatusMessage(`Vectorizing ${filename}... This may take a moment.`)
    setError(null)

    try {
      console.log(`Manually vectorizing file ${filename}`)
      const response = await fetch(`/api/process-document`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileName: filename }),
      })

      if (!response.ok) {
        let errorMessage = `Vectorization failed with status: ${response.status}`

        try {
          const errorData = await response.json()
          if (errorData.details) {
            errorMessage += `. ${errorData.details}`
          }
        } catch (e) {
          // If response is not JSON, try to get text
          try {
            const errorText = await response.text()
            errorMessage += `. ${errorText}`
          } catch (e2) {
            // If we can't get text either, just use the status
          }
        }

        throw new Error(errorMessage)
      }

      let data
      try {
        data = await response.json()
      } catch (e) {
        console.warn("Response is not valid JSON:", e)
        data = { message: "Vectorization completed but returned non-JSON response" }
      }

      console.log(`Vectorization response:`, data)

      setStatusMessage(`File ${filename} vectorized successfully!`)

      // Refresh the document list
      await fetchDocuments()

      // Clear status message after a delay
      setTimeout(() => {
        setStatusMessage(null)
      }, 5000)
    } catch (error) {
      console.error("Error vectorizing file:", error)
      setError(error instanceof Error ? error.message : "Failed to vectorize file")
      setStatusMessage(null)
    } finally {
      setIsVectorizing(false)
    }
  }

  // Filter documents based on active tab and search query
  const getFilteredDocuments = () => {
    let filtered = documents

    // Filter by tab/category
    if (activeTab !== "upload") {
      if (activeTab === "vector") {
        // For vector tab, use the dedicated vectorizedFiles list
        filtered = vectorizedFiles

        // Apply search filter if needed
        if (searchQuery) {
          filtered = filtered.filter((doc) => doc.name.toLowerCase().includes(searchQuery.toLowerCase()))
        }

        return filtered
      } else if (activeTab !== "all") {
        filtered = filtered.filter((doc) => doc.category === activeTab)
      }
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((doc) => doc.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }

    return filtered
  }

  const filteredDocuments = getFilteredDocuments()

  // Get icon based on file type
  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase()
    if (type === "pdf") return <FilePdf className="h-5 w-5 mr-2 text-foreground" />
    if (["md", "markdown", "txt"].includes(type)) return <FileCode className="h-5 w-5 mr-2 text-foreground" />
    if (type === "vec" || type.includes("vector")) return <Database className="h-5 w-5 mr-2 text-foreground" />
    return <FileText className="h-5 w-5 mr-2 text-foreground" />
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-5xl py-12">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to chat
          </Link>
        </div>

        <div className="flex items-center mb-8">
          <Book className="h-8 w-8 mr-3 text-foreground" />
          <h1 className="text-3xl font-bold">Knowledge Base</h1>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6 flex items-start">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 mr-2 flex-shrink-0" />
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {statusMessage && (
          <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6">
            <p className="text-foreground flex items-center">
              {isUploading || isVectorizing ? (
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-foreground"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : null}
              {statusMessage}
            </p>
          </div>
        )}

        <div className="bg-card rounded-lg border border-border">
          <Tabs defaultValue="pdf" value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b border-border px-6 pt-4">
              <TabsList className="bg-muted">
                <TabsTrigger
                  value="pdf"
                  className="data-[state=active]:bg-background data-[state=active]:text-foreground"
                >
                  <FilePdf className="h-4 w-4 mr-2" />
                  PDF Files
                </TabsTrigger>
                <TabsTrigger
                  value="markdown"
                  className="data-[state=active]:bg-background data-[state=active]:text-foreground"
                >
                  <FileCode className="h-4 w-4 mr-2" />
                  Markdown Files
                </TabsTrigger>
                <TabsTrigger
                  value="vector"
                  className="data-[state=active]:bg-background data-[state=active]:text-foreground"
                >
                  <Database className="h-4 w-4 mr-2" />
                  FAISS Vector Files
                </TabsTrigger>
                <TabsTrigger
                  value="upload"
                  className="data-[state=active]:bg-background data-[state=active]:text-foreground"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload New File
                </TabsTrigger>
              </TabsList>
            </div>

            {/* PDF Files Tab */}
            <TabsContent value="pdf" className="p-6">
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search PDF documents..."
                    className="pl-10 bg-background border-border"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
                </div>
              ) : filteredDocuments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Size</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date Added</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocuments.map((doc) => (
                        <tr key={doc.id} className="border-b border-border hover:bg-muted/50">
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              {getFileIcon(doc.type)}
                              {doc.name}
                            </div>
                          </td>
                          <td className="py-3 px-4">{doc.size} MB</td>
                          <td className="py-3 px-4">{doc.date}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleVectorize(doc.name)}
                                className="text-muted-foreground hover:text-green-600"
                                title="Vectorize file"
                                disabled={isVectorizing}
                              >
                                {isVectorizing ? (
                                  <svg
                                    className="animate-spin h-4 w-4"
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
                                ) : (
                                  <Database className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(doc.id)}
                                className="text-muted-foreground hover:text-destructive"
                                title="Delete file"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FilePdf className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No PDF documents found</h3>
                  <p className="text-muted-foreground mb-6">
                    {searchQuery ? "No documents match your search criteria." : "Your PDF collection is empty."}
                  </p>
                  <Button
                    onClick={() => setActiveTab("upload")}
                    variant="outline"
                    className="justify-start bg-muted border-border hover:bg-muted/80 group transition-all duration-300"
                  >
                    <Plus className="h-4 w-4 mr-2 group-hover:text-foreground/90" />
                    <span className="group-hover:text-foreground/90">Add PDF Document</span>
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Markdown Files Tab */}
            <TabsContent value="markdown" className="p-6">
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search markdown documents..."
                    className="pl-10 bg-background border-border"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
                </div>
              ) : filteredDocuments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Size</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date Added</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocuments.map((doc) => (
                        <tr key={doc.id} className="border-b border-border hover:bg-muted/50">
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              {getFileIcon(doc.type)}
                              {doc.name}
                            </div>
                          </td>
                          <td className="py-3 px-4">{doc.size} MB</td>
                          <td className="py-3 px-4">{doc.date}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleVectorize(doc.name)}
                                className="text-muted-foreground hover:text-green-600"
                                title="Vectorize file"
                                disabled={isVectorizing}
                              >
                                {isVectorizing ? (
                                  <svg
                                    className="animate-spin h-4 w-4"
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
                                ) : (
                                  <Database className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(doc.id)}
                                className="text-muted-foreground hover:text-destructive"
                                title="Delete file"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileCode className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No markdown documents found</h3>
                  <p className="text-muted-foreground mb-6">
                    {searchQuery ? "No documents match your search criteria." : "Your markdown collection is empty."}
                  </p>
                  <Button
                    onClick={() => setActiveTab("upload")}
                    variant="outline"
                    className="justify-start bg-muted border-border hover:bg-muted/80 group transition-all duration-300"
                  >
                    <Plus className="h-4 w-4 mr-2 group-hover:text-foreground/90" />
                    <span className="group-hover:text-foreground/90">Add Markdown Document</span>
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Vector Database Tab */}
            <TabsContent value="vector" className="p-6">
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search vector database..."
                    className="pl-10 bg-background border-border"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
                </div>
              ) : filteredDocuments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Size</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date Added</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocuments.map((doc) => (
                        <tr key={doc.id} className="border-b border-border hover:bg-muted/50">
                          <td className="py-3 px-4">
                            <div className="flex items-center">
                              {getFileIcon(doc.type)}
                              {doc.name}
                            </div>
                          </td>
                          <td className="py-3 px-4">{doc.size} MB</td>
                          <td className="py-3 px-4">{doc.date}</td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(doc.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No FAISS vector files found</h3>
                  <p className="text-muted-foreground mb-6">
                    {searchQuery
                      ? "No vector files match your search criteria."
                      : "Your vector database is empty. Upload and process documents to create FAISS vector files."}
                  </p>
                  <Button
                    onClick={() => setActiveTab("upload")}
                    variant="outline"
                    className="justify-start bg-muted border-border hover:bg-muted/80 group transition-all duration-300"
                  >
                    <Plus className="h-4 w-4 mr-2 group-hover:text-foreground/90" />
                    <span className="group-hover:text-foreground/90">Add Document to Vectorize</span>
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* Upload New File Tab */}
            <TabsContent value="upload" className="p-6">
              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-2">Upload Document to Knowledge Base</h2>
                  <p className="text-muted-foreground mb-4">
                    Add documents to your knowledge base to help the AI provide more accurate and relevant responses.
                    Supported formats: PDF and Markdown. Files will be automatically vectorized after upload.
                  </p>

                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                    <Input
                      type="file"
                      id="document"
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".pdf,.md,.markdown,.txt"
                    />
                    <Label htmlFor="document" className="flex flex-col items-center justify-center cursor-pointer">
                      {file ? (
                        <>
                          {file.name.toLowerCase().endsWith(".pdf") ? (
                            <FilePdf className="h-12 w-12 text-red-500 mb-3" />
                          ) : (
                            <FileCode className="h-12 w-12 text-foreground mb-3" />
                          )}
                          <span className="text-lg font-medium">{file.name}</span>
                          <span className="text-sm text-muted-foreground mt-1">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-12 w-12 text-muted-foreground mb-3" />
                          <span className="text-lg font-medium">Click to upload a document</span>
                          <span className="text-sm text-muted-foreground mt-1">or drag and drop here</span>
                        </>
                      )}
                    </Label>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="mr-2 border-border"
                    onClick={() => {
                      setFile(null)
                      setActiveTab("pdf")
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="outline"
                    className="justify-start bg-muted border-border hover:bg-muted/80 group transition-all duration-300"
                    disabled={!file || isUploading || isVectorizing}
                  >
                    {isUploading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-foreground"
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
                        <span className="group-hover:text-foreground/90">Uploading...</span>
                      </>
                    ) : isVectorizing ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-foreground"
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
                        <span className="group-hover:text-foreground/90">Vectorizing...</span>
                      </>
                    ) : (
                      <>
                        <span className="group-hover:text-foreground/90">Add to Knowledge Base</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
