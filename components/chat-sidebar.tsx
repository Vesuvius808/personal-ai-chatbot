"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus, Settings, ClipboardCheck, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ThemeToggle } from "@/components/theme-toggle"
import Link from "next/link"

interface ChatSidebarProps {
  isOpen: boolean
  onToggle: () => void
  chats: { id: string; name: string }[]
  selectedChat: string
  onSelectChat: (chatId: string) => void
  onDeleteChat?: (chatId: string) => void
  selectedModel: string
  onSelectModel: (model: string) => void
}

export default function ChatSidebar({
  isOpen,
  onToggle,
  chats,
  selectedChat,
  onSelectChat,
  onDeleteChat,
  selectedModel,
  onSelectModel,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredChats, setFilteredChats] = useState(chats)

  // Update filtered chats when chats or search query changes
  useEffect(() => {
    if (!searchQuery) {
      setFilteredChats(chats)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredChats(chats.filter((chat) => chat.name.toLowerCase().includes(query)))
    }
  }, [chats, searchQuery])

  if (!isOpen) return null

  return (
    <div className="w-64 h-full bg-gray-100 dark:bg-gray-800 flex flex-col border-r border-border relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-200/50 dark:bg-gray-700/50">
        <div className="flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2"
          >
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
          </svg>
          <span className="font-medium">LegalMind</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onToggle} className="text-muted-foreground hover:text-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18"></path>
            <path d="m6 6 12 12"></path>
          </svg>
        </Button>
      </div>

      {/* Search */}
      <div className="p-3 mb-1 relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search"
            className="pl-10 h-7 py-1 bg-white dark:bg-gray-700 border-border text-sm focus:ring-1 focus:ring-ring transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-border to-transparent"></div>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-3 pb-2">
        <Button
          variant="outline"
          className="w-full justify-start bg-transparent border-border hover:bg-gray-200 dark:hover:bg-gray-700 group transition-all duration-300"
          onClick={() => onSelectChat("new")}
        >
          <Plus className="mr-2 h-4 w-4 group-hover:text-foreground/90" />
          <span className="group-hover:text-foreground/90">New chat</span>
          <div className="absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </Button>
      </div>

      {/* Risk Assessment Button */}
      <div className="px-3 pb-2">
        <Link href="/risk-assessment" className="w-full">
          <Button
            variant="outline"
            className="w-full justify-start bg-transparent border-border hover:bg-gray-200 dark:hover:bg-gray-700 group transition-all duration-300"
          >
            <ClipboardCheck className="mr-2 h-4 w-4 group-hover:text-foreground/90" />
            <span className="group-hover:text-foreground/90">Risk Assessment</span>
            <div className="absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </Button>
        </Link>
      </div>

      {/* Deep Search Button */}
      <div className="px-3 pb-2">
        <Link href="/deep-search" className="w-full">
          <Button
            variant="outline"
            className="w-full justify-start bg-transparent border-border hover:bg-gray-200 dark:hover:bg-gray-700 group transition-all duration-300"
          >
            <Search className="mr-2 h-4 w-4" />
            Deep Search
          </Button>
        </Link>
      </div>

      {/* Knowledge Base Button */}
      <div className="px-3 pb-3 mb-2">
        <Link href="/knowledge-base" className="w-full">
          <Button
            variant="outline"
            className="w-full justify-start bg-transparent border-border hover:bg-gray-200 dark:hover:bg-gray-700 group transition-all duration-300"
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
              className="mr-2 h-4 w-4"
            >
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
            </svg>
            Knowledge Base
          </Button>
        </Link>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase relative">
            Chat History
            <div className="absolute bottom-0 left-3 right-3 h-[1px] bg-gradient-to-r from-transparent via-border to-transparent"></div>
          </h3>

          {filteredChats.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              {searchQuery ? "No chats match your search" : "No chat history yet"}
            </div>
          ) : (
            filteredChats
              .filter((chat) => chat.id !== "new")
              .map((chat) => (
                <div key={chat.id} className="group relative">
                  <Button
                    variant="ghost"
                    className={`w-full justify-start text-sm relative ${
                      selectedChat === chat.id
                        ? "bg-gray-300 dark:bg-gray-600 text-foreground after:absolute after:left-0 after:top-0 after:bottom-0 after:w-[2px] after:bg-gradient-to-b after:from-primary/10 after:via-primary/40 after:to-primary/10"
                        : "text-muted-foreground hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                    onClick={() => onSelectChat(chat.id)}
                  >
                    <span className="truncate">{chat.name}</span>
                  </Button>

                  {onDeleteChat && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteChat(chat.id)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))
          )}
        </div>
      </div>

      {/* User */}
      <div className="p-3 border-t border-gray-300 dark:border-gray-600 relative">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-border to-transparent"></div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:bg-muted/50">
              <div className="flex items-center">
                <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center mr-2">
                  <span className="text-xs font-medium text-white">OV</span>
                </div>
                <span>Olivier Velez</span>
              </div>
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                  </svg>
                  <span>API Connections</span>
                </div>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <Settings size={16} />
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="5"></circle>
                    <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"></path>
                  </svg>
                  <span>Theme</span>
                </div>
                <ThemeToggle />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
                  </svg>
                  <span>Add Knowledge Base</span>
                </div>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
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
                  >
                    <path d="M12 5v14"></path>
                    <path d="M5 12h14"></path>
                  </svg>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
