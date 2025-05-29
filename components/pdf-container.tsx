import type React from "react"
import { forwardRef } from "react"

interface PDFContainerProps {
  children: React.ReactNode
  className?: string
}

const PDFContainer = forwardRef<HTMLDivElement, PDFContainerProps>(({ children, className = "" }, ref) => {
  return (
    <div
      ref={ref}
      className={`bg-[#232323] p-6 rounded-lg ${className}`}
      style={{
        maxWidth: "100%",
      }}
    >
      {children}
    </div>
  )
})

PDFContainer.displayName = "PDFContainer"

export default PDFContainer
