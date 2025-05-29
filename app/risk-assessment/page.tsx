"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ClipboardCheck, Upload, FileText, ArrowLeft, AlertCircle, Copy, Check, Download } from "lucide-react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { CodeRenderer } from "@/components/code-renderer"
import { downloadAsTextFile } from "@/lib/pdf-utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import PDFContainer from "@/components/pdf-container"
import { Textarea } from "@/components/ui/textarea"

// Add a type for the assessment response
interface AssessmentResponse {
  content: string
  role: string
}

export default function RiskAssessmentPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [assessmentResponse, setAssessmentResponse] = useState<AssessmentResponse | null>(null)
  const [isAssessing, setIsAssessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedContent, setEditedContent] = useState<string>("")

  // Reference to the assessment content
  const assessmentContentRef = useRef<HTMLDivElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setIsSubmitted(false)
      setAssessmentResponse(null)
      setError(null)
      setErrorDetails(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setIsUploading(true)
    setIsAssessing(true)
    setError(null)
    setErrorDetails(null)

    try {
      // Validate file type
      const fileType = file.type.toLowerCase()
      const fileName = file.name.toLowerCase()

      if (
        !(
          fileType.includes("pdf") ||
          fileType.includes("text") ||
          fileName.endsWith(".md") ||
          fileName.endsWith(".txt")
        )
      ) {
        throw new Error("Unsupported file type. Please upload a PDF, Markdown, or Text file.")
      }

      // Create a FormData object to send the file
      const formData = new FormData()
      formData.append("file", file)

      console.log("Sending file:", file.name, file.type, file.size)

      // Call our Next.js API route
      const response = await fetch("/api/assess-risk", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        try {
          // Try to parse as JSON
          const errorData = JSON.parse(errorText)
          throw new Error(
            `Server responded with status: ${response.status}${
              errorData?.details ? `\nDetails: ${errorData.details}` : ""
            }`,
          )
        } catch (jsonError) {
          // If not JSON, use the text directly
          throw new Error(`Server responded with status: ${response.status}\nDetails: ${errorText}`)
        }
      }

      const data = await response.json()
      setAssessmentResponse(data)
      setIsSubmitted(true)
    } catch (error) {
      console.error("Error assessing contract:", error)
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"

      // Extract the main error message and details
      const mainError = errorMessage.split("\n")[0]
      const details = errorMessage.includes("\nDetails:") ? errorMessage.split("\nDetails:")[1].trim() : null

      setError(mainError)
      setErrorDetails(details)
    } finally {
      setIsUploading(false)
      setIsAssessing(false)
    }
  }

  // Function to copy the assessment content to clipboard
  const handleCopyContent = () => {
    if (!assessmentResponse) return

    navigator.clipboard
      .writeText(assessmentResponse.content)
      .then(() => {
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err)
      })
  }

  // Function to download the assessment as a text file
  const handleDownloadText = () => {
    if (!assessmentResponse || !file) return

    setIsDownloading(true)

    try {
      const filename = `Risk_Assessment_${file.name.split(".")[0]}.txt`
      downloadAsTextFile(assessmentResponse.content, filename)
    } catch (error) {
      console.error("Error downloading text:", error)
    } finally {
      setIsDownloading(false)
    }
  }

  // Function to save the assessment as PDF
  const handleSavePDF = async () => {
    if (!assessmentContentRef.current || !file) return

    setIsGeneratingPDF(true)

    try {
      // Try to dynamically import the PDF generation utility
      const pdfUtils = await import("@/utils/pdf-generator")
      const filename = `Risk_Assessment_${file.name.split(".")[0]}.pdf`

      await pdfUtils.generatePDF(assessmentContentRef.current, filename)
    } catch (error) {
      console.error("Error generating PDF:", error)
      // Fallback to text download if PDF generation fails
      handleDownloadText()
      alert("PDF generation failed. Downloaded as text instead.")
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // Function to handle entering edit mode
  const handleEnterEditMode = () => {
    setEditedContent(assessmentResponse?.content || "")
    setIsEditMode(true)
  }

  // Function to save edits
  const handleSaveEdits = () => {
    if (assessmentResponse) {
      const updatedResponse = {
        ...assessmentResponse,
        content: editedContent,
      }
      setAssessmentResponse(updatedResponse)
    }
    setIsEditMode(false)
  }

  // Function to preprocess markdown text for better rendering
  function preprocessMarkdown(content: string): string {
    if (typeof content !== "string") {
      return String(content)
    }

    let processed = content

    // Format section headers with ### for better PDF rendering
    processed = processed.replace(/^(#+)\s+(.+)$/gm, (match, hashes, title) => {
      // Ensure consistent heading format with ### prefix
      return `### ${title}`
    })

    // Convert section headers with dashed lines to proper markdown headers
    processed = processed.replace(/^(─{3,}|-{3,})\s*\r?\n([^\r\n]+)/gm, "\n### $2\n")

    // Convert numbered headers to proper markdown headers with numbers preserved
    processed = processed.replace(/^(\d+)\.\s+([^*\r\n][^\r\n]*)(?:\r?\n|$)/gm, "### $1. $2\n\n")

    // Handle bullet points
    processed = processed.replace(/^•\s+(.*)/gm, "* $1")
    processed = processed.replace(/^(\s+)•\s+(.*)/gm, "$1* $2")

    // Ensure bullet points have proper spacing
    processed = processed.replace(/^(\*\s+.*?)(?:\r?\n)(?!\*\s+)/gm, "$1\n\n")

    // Replace dashed line code blocks with proper markdown code blocks
    processed = processed.replace(
      /^(-{3,}|─{3,})[\r\n\s]*([\s\S]*?)[\r\n\s]*^(-{3,}|─{3,})/gm,
      (match, startDash, codeContent, endDash) => {
        // Determine the language based on content (simple heuristic)
        let language = "text" // Default to text

        // Check for language hints in the first line
        const firstLine = codeContent.trim().split("\n")[0]
        if (firstLine.includes("#")) language = "python"
        else if (firstLine.includes("//")) language = "javascript"
        else if (firstLine.includes("import ") || firstLine.includes("from ")) language = "python"
        else if (firstLine.includes("function ") || firstLine.includes("const ") || firstLine.includes("let "))
          language = "javascript"
        else if (firstLine.includes("$") || firstLine.includes("python ")) language = "bash"

        return "```" + language + "\n" + codeContent.trim() + "\n```"
      },
    )

    // Fix any broken markdown links
    processed = processed.replace(/\[([^\]]+)\]$([^)]+)$/g, "[$1]($2)")

    // Add extra spacing between sections for better readability
    processed = processed.replace(/^(###\s+.*?)$/gm, "\n$1\n")

    // Add extra spacing after paragraphs
    processed = processed.replace(/(.+)(?:\r?\n)(?![\s*#>])/gm, "$1\n\n")

    return processed
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-3xl py-12">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to chat
          </Link>
        </div>

        <div className="flex items-center mb-8">
          <ClipboardCheck className="h-8 w-8 mr-3 text-foreground" />
          <h1 className="text-3xl font-bold">Risk Assessment</h1>
        </div>

        <div className="bg-card rounded-lg p-6 border border-border mb-6">
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Upload Contract for Analysis</h2>
              <p className="text-muted-foreground mb-4">
                Upload a contract document to analyze potential risks. We support PDF, Markdown, and Text files.
              </p>

              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Input
                  type="file"
                  id="document"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.md,.txt,text/plain,application/pdf"
                />
                <Label htmlFor="document" className="flex flex-col items-center justify-center cursor-pointer">
                  {file ? (
                    <>
                      <FileText className="h-12 w-12 text-foreground mb-3" />
                      <span className="text-lg font-medium">{file.name}</span>
                      <span className="text-sm text-muted-foreground mt-1">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 text-muted-foreground mb-3" />
                      <span className="text-lg font-medium">Click to upload a contract document</span>
                      <span className="text-sm text-muted-foreground mt-1">or drag and drop here</span>
                    </>
                  )}
                </Label>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="outline"
                className="justify-start bg-muted border-border hover:bg-muted/80 group transition-all duration-300"
                disabled={!file || isUploading}
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
                    <span className="group-hover:text-foreground/90">Analyzing...</span>
                  </>
                ) : (
                  <>
                    <span className="group-hover:text-foreground/90">Analyze Contract</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Display error message if there's an error */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold mb-2 text-destructive">Error</h3>
                <p className="text-foreground mb-2">{error}</p>
                {errorDetails && (
                  <div className="mt-2 p-2 bg-destructive/5 rounded border border-destructive/20 text-sm text-destructive font-mono overflow-x-auto">
                    {errorDetails}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Display loading state */}
        {isAssessing && !assessmentResponse && (
          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="flex justify-start">
              <div className="max-w-[90%] rounded-2xl px-4 py-3 text-foreground">
                <p className="text-muted-foreground">Thinking...</p>
              </div>
            </div>
          </div>
        )}

        {assessmentResponse && (
          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <span className="font-medium">Risk Assessment Results</span>
              </div>

              {/* Action buttons */}
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 border-border bg-muted text-foreground hover:bg-muted/80 disabled:bg-muted/50 disabled:text-muted-foreground disabled:opacity-80"
                  onClick={handleCopyContent}
                  disabled={isCopied}
                >
                  {isCopied ? (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Copy</span>
                    </>
                  )}
                </Button>

                {!isEditMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 border-border bg-muted text-foreground hover:bg-muted/80"
                    onClick={handleEnterEditMode}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    <span>Edit</span>
                  </Button>
                )}

                {isEditMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 border-border bg-muted text-foreground hover:bg-muted/80"
                    onClick={handleSaveEdits}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                      <polyline points="17 21 17 13 7 13 7 21"></polyline>
                      <polyline points="7 3 7 8 15 8"></polyline>
                    </svg>
                    <span>Save Edits</span>
                  </Button>
                )}

                {!isEditMode && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1 border-border bg-muted text-foreground hover:bg-muted/80 disabled:bg-muted/50 disabled:text-muted-foreground disabled:opacity-80"
                        disabled={isDownloading || isGeneratingPDF}
                      >
                        {isDownloading || isGeneratingPDF ? (
                          <>
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
                            <span className="ml-1">Saving...</span>
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4" />
                            <span>Save</span>
                          </>
                        )}
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent className="w-48 p-0 bg-card border-border">
                      <div className="p-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-sm text-foreground hover:bg-muted disabled:text-muted-foreground disabled:bg-transparent"
                          onClick={handleSavePDF}
                          disabled={isGeneratingPDF}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Save as PDF
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-sm text-foreground hover:bg-muted disabled:text-muted-foreground disabled:bg-transparent"
                          onClick={handleDownloadText}
                          disabled={isDownloading}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Save as Text
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>

            {/* Assessment content */}
            <PDFContainer ref={assessmentContentRef} className="pdf-container">
              {isEditMode ? (
                <div className="w-full">
                  <Textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full h-[60vh] p-4 bg-background text-foreground border border-border rounded-md font-mono text-sm"
                  />
                </div>
              ) : (
                <div className="prose prose-invert max-w-none markdown-content pdf-content">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code: CodeRenderer,
                      h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />,
                      h2: ({ node, ...props }) => <h2 className="text-xl font-bold mt-5 mb-3" {...props} />,
                      h3: ({ node, ...props }) => <h3 className="text-lg font-bold mt-4 mb-2" {...props} />,
                      h4: ({ node, ...props }) => <h4 className="text-base font-bold mt-3 mb-2" {...props} />,
                      h5: ({ node, ...props }) => <h5 className="text-sm font-bold mt-3 mb-1" {...props} />,
                      h6: ({ node, ...props }) => <h6 className="text-xs font-bold mt-3 mb-1" {...props} />,
                      p: ({ node, ...props }) => <p className="mb-4 leading-relaxed" {...props} />,
                      ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />,
                      ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-4 space-y-2" {...props} />,
                      li: ({ node, ...props }) => <li className="mb-2 leading-relaxed" {...props} />,
                      blockquote: ({ node, ...props }) => (
                        <blockquote
                          className="border-l-4 border-border pl-4 py-1 my-4 bg-muted rounded-r-md"
                          {...props}
                        />
                      ),
                      a: ({ node, ...props }) => (
                        <a
                          className="text-primary hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                          {...props}
                        />
                      ),
                      table: ({ node, ...props }) => (
                        <div className="overflow-x-auto my-4">
                          <table className="min-w-full border border-border rounded-md" {...props} />
                        </div>
                      ),
                      thead: ({ node, ...props }) => <thead className="bg-muted" {...props} />,
                      th: ({ node, ...props }) => (
                        <th className="px-4 py-2 border-b border-border text-left" {...props} />
                      ),
                      td: ({ node, ...props }) => <td className="px-4 py-2 border-b border-border" {...props} />,
                      hr: ({ node, ...props }) => <hr className="my-6 border-border" {...props} />,
                      img: ({ node, ...props }) => (
                        <img className="max-w-full h-auto rounded-md my-4" {...props} alt={props.alt || ""} />
                      ),
                    }}
                  >
                    {preprocessMarkdown(assessmentResponse?.content || "")}
                  </ReactMarkdown>
                </div>
              )}
            </PDFContainer>

            <div className="mt-6 flex justify-end">
              <Button
                variant="outline"
                className="justify-start bg-muted border-border hover:bg-muted/80 group transition-all duration-300"
                onClick={() => {
                  setFile(null)
                  setIsSubmitted(false)
                  setAssessmentResponse(null)
                }}
              >
                <span className="group-hover:text-foreground/90">Analyze Another Contract</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
