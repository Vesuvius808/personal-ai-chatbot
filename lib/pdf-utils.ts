export function downloadAsTextFile(content: string, filename: string): void {
  // Create a blob with the text content
  const blob = new Blob([content], { type: "text/plain" })

  // Create a URL for the blob
  const url = URL.createObjectURL(blob)

  // Create a temporary anchor element
  const a = document.createElement("a")
  a.href = url
  a.download = filename

  // Append to the document, click it, and remove it
  document.body.appendChild(a)
  a.click()

  // Clean up
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 100)
}
