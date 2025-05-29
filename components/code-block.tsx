"use client"

import { useState, useEffect } from "react"
import { Copy, Check } from "lucide-react"

export function CodeBlock({ language, value }: { language: string; value: string }) {
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
    navigator.clipboard.writeText(value)
    setIsCopied(true)
  }

  // Simple syntax highlighting function
  const highlightCode = (code: string, lang: string) => {
    // Basic highlighting for common languages
    if (["js", "javascript", "jsx", "typescript", "tsx"].includes(lang)) {
      return code
        .replace(
          /\b(const|let|var|function|return|import|export|from|if|else|for|while|class|extends|async|await)\b/g,
          '<span class="keyword">$1</span>',
        )
        .replace(/\b(true|false|null|undefined|this|super)\b/g, '<span class="boolean">$1</span>')
        .replace(/("[^"]*")|('[^']*')|(`[^`]*`)/g, '<span class="string">$1</span>')
        .replace(/\b(\d+)\b/g, '<span class="number">$1</span>')
        .replace(/\/\/(.*)/g, '<span class="comment">//$1</span>')
        .replace(/\/\*([\s\S]*?)\*\//g, '<span class="comment">/*$1*/</span>')
    } else if (["py", "python"].includes(lang)) {
      return code
        .replace(
          /\b(def|class|import|from|as|return|if|elif|else|for|while|with|try|except|finally|raise|pass|lambda)\b/g,
          '<span class="keyword">$1</span>',
        )
        .replace(/\b(True|False|None|self)\b/g, '<span class="boolean">$1</span>')
        .replace(/("[^"]*")|('[^']*')|(`[^`]*`)/g, '<span class="string">$1</span>')
        .replace(/\b(\d+)\b/g, '<span class="number">$1</span>')
        .replace(/#(.*)/g, '<span class="comment">#$1</span>')
    } else if (["bash", "sh"].includes(lang)) {
      return code
        .replace(/^(\$\s+)(.*)$/gm, '$1<span class="function">$2</span>')
        .replace(/\b(npm|npx|cd)\b/g, '<span class="keyword">$1</span>')
    }

    // Default - just return the code
    return code
  }

  return (
    <div className="my-4 code-block-container">
      <div className="flex items-center justify-between bg-[#1a1a1a] px-4 py-2 text-xs text-gray-400 rounded-t-md code-block-header">
        <span className="font-mono">{language}</span>
        <button className="hover:text-white transition-colors flex items-center gap-1" onClick={handleCopy}>
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
      <div className="bg-[#292828] p-4 overflow-x-auto rounded-b-md code-block-content">
        <pre className="language-code">
          <code
            className={`language-${language}`}
            dangerouslySetInnerHTML={{
              __html: highlightCode(
                value
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/"/g, "&quot;")
                  .replace(/'/g, "&#039;"),
                language,
              ),
            }}
          />
        </pre>
      </div>
    </div>
  )
}
