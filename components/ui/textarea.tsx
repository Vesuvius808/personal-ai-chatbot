import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[60px] h-[80px] w-full min-w-[300px] rounded-3xl border border-input bg-[#3C3C3C] px-4 pt-3 pb-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-y-auto",
        className,
      )}
      ref={ref}
      aria-autocomplete="both"
      spellCheck="true"
      autoComplete="off"
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
