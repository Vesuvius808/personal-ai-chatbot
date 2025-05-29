"use client"

import { useState, useEffect } from "react"
import { Copy, Check } from "lucide-react"

export function CodeRenderer({ node, className, children, ...props }: any) {
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => {
        setIsCopied(false)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isCopied])

  const handleCopy = () => {
    const code = String(children).replace(/\n$/, "")
    navigator.clipboard.writeText(code)
    setIsCopied(true)
  }

  const match = /language-(\w+)/.exec(className || "")
  const code = String(children).replace(/\n$/, "")
  const isInline = !match

  if (!isInline) {
    return (
      <div className="my-4 code-block-container">
        <div className="flex items-center justify-between px-4 py-2 text-xs text-gray-400 bg-[#1a1a1a] rounded-t-md code-block-header">
          <span>{match ? match[1] : "code"}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
          >
            {isCopied ? (
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
        <pre className="p-4 overflow-x-auto text-sm bg-[#292828] rounded-b-md code-block-content">
          <code className={`language-${match ? match[1] : "text"}`}>{code}</code>
        </pre>
      </div>
    )
  }

  // For inline code
  return (
    <code className="px-1.5 py-0.5 mx-0.5 rounded text-sm font-mono bg-[#2a2a2a]" {...props}>
      {children}
    </code>
  )
}
