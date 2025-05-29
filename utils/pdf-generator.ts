import jsPDF from "jspdf"

export async function generatePDF(element: HTMLElement, filename: string): Promise<void> {
  try {
    // Get the content as text
    const content = element.innerText || element.textContent || ""

    // Create a new PDF document
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    })

    // Set font and size
    pdf.setFont("helvetica")
    pdf.setFontSize(11)

    // Define margins
    const margin = 20 // 20mm margins
    const pageWidth = 210 // A4 width in mm
    const pageHeight = 297 // A4 height in mm
    const contentWidth = pageWidth - margin * 2

    // Process the content by sections
    const lines = content.split("\n")
    let y = margin // Start at top margin
    let currentPage = 1

    // Process each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // Skip empty lines
      if (!line) {
        y += 5 // Add some space for empty lines
        continue
      }

      // Check if we need a new page
      if (y > pageHeight - margin) {
        pdf.addPage()
        currentPage++
        y = margin // Reset y position for new page
      }

      // Handle headings
      if (line.startsWith("###")) {
        // Add extra space before headings
        y += 10

        // Check if we need a new page after adding space
        if (y > pageHeight - margin) {
          pdf.addPage()
          currentPage++
          y = margin
        }

        pdf.setFont("helvetica", "bold")
        pdf.setFontSize(14)
        pdf.text(line.replace(/^###\s*/, ""), margin, y)
        y += 8 // Space after heading
        pdf.setFont("helvetica", "normal")
        pdf.setFontSize(11)
        continue
      }

      // Handle subheadings (numbered sections)
      if (/^\d+\.\s/.test(line)) {
        y += 5 // Add space before subheading
        pdf.setFont("helvetica", "bold")
        pdf.setFontSize(12)
        pdf.text(line, margin, y)
        y += 6 // Space after subheading
        pdf.setFont("helvetica", "normal")
        pdf.setFontSize(11)
        continue
      }

      // Handle bullet points
      if (line.startsWith("•") || line.startsWith("*") || line.startsWith("-")) {
        const bulletText = line.substring(1).trim()
        const splitText = pdf.splitTextToSize(bulletText, contentWidth - 10) // Indent bullet points

        for (let j = 0; j < splitText.length; j++) {
          // Check if we need a new page
          if (y > pageHeight - margin) {
            pdf.addPage()
            currentPage++
            y = margin
          }

          // First line gets the bullet
          if (j === 0) {
            pdf.text("•", margin, y)
            pdf.text(splitText[j], margin + 5, y) // Indent after bullet
          } else {
            pdf.text(splitText[j], margin + 5, y) // Maintain indent for wrapped lines
          }

          y += 6 // Line spacing
        }

        y += 2 // Extra space after bullet point
        continue
      }

      // Regular paragraph text
      const splitText = pdf.splitTextToSize(line, contentWidth)

      for (let j = 0; j < splitText.length; j++) {
        // Check if we need a new page
        if (y > pageHeight - margin) {
          pdf.addPage()
          currentPage++
          y = margin
        }

        pdf.text(splitText[j], margin, y)
        y += 6 // Line spacing
      }

      y += 2 // Paragraph spacing
    }

    // Add page numbers
    const totalPages = currentPage
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i)
      pdf.setFontSize(9)
      pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 10)
    }

    // Add title at the top of first page
    pdf.setPage(1)
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(16)
    pdf.text("Contract Risk Assessment", margin, margin - 10)

    // Save the PDF
    pdf.save(filename)
  } catch (error) {
    console.error("Error generating PDF:", error)
    throw error
  }
}
