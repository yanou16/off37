"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Send, Plus, MessageSquare, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { marked } from "marked"
import ExportPdfButton from "@/components/export-pdf-button"

// Configure marked to avoid DOM nesting issues
marked.setOptions({
  breaks: true,
  gfm: true
})
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
}

interface ChatState {
  stage: 'initial' | 'preference_gathering' | 'location_selection' | 'recommendations'
  userPreferences: string[]
  selectedLocation: string | null
  suggestedLocations: string[]
}

interface Chat {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
  chatState?: ChatState
}

export default function ChatbotInterface() {
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load chats from localStorage on mount
  useEffect(() => {
    const savedChats = localStorage.getItem("chatbot-chats")
    if (savedChats) {
      const parsedChats = JSON.parse(savedChats).map((chat: any) => ({
        ...chat,
        createdAt: new Date(chat.createdAt),
        updatedAt: new Date(chat.updatedAt),
      }))
      setChats(parsedChats)
      if (parsedChats.length > 0) {
        setCurrentChatId(parsedChats[0].id)
      }
    } else {
      // Create initial chat if none exists
      createNewChat()
    }
  }, [])

  // Save chats to localStorage whenever chats change
  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem("chatbot-chats", JSON.stringify(chats))
    }
  }, [chats])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chats, currentChatId])

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: "Trip Planning Chat",
      messages: [
        {
          id: "1",
          content: "What do you like?",
          role: "assistant",
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
      chatState: {
        stage: 'preference_gathering',
        userPreferences: [],
        selectedLocation: null,
        suggestedLocations: []
      }
    }

    setChats((prev) => [newChat, ...prev])
    setCurrentChatId(newChat.id)
  }

  const deleteChat = (chatId: string) => {
    setChats((prev) => {
      const filtered = prev.filter((chat) => chat.id !== chatId)
      if (currentChatId === chatId && filtered.length > 0) {
        setCurrentChatId(filtered[0].id)
      } else if (filtered.length === 0) {
        createNewChat()
      }
      return filtered
    })
  }

  const updateChatTitle = (chatId: string, firstUserMessage: string) => {
    const title = firstUserMessage.length > 30 ? firstUserMessage.substring(0, 30) + "..." : firstUserMessage

    setChats((prev) => prev.map((chat) => (chat.id === chatId ? { ...chat, title, updatedAt: new Date() } : chat)))
  }

  const addMessage = (chatId: string, message: Message) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              messages: [...chat.messages, message],
              updatedAt: new Date(),
            }
          : chat,
      ),
    )
  }

  const updateChatState = (chatId: string, newState: ChatState) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              chatState: newState,
              updatedAt: new Date(),
            }
          : chat,
      ),
    )
  }

  const currentChat = chats.find((chat) => chat.id === currentChatId)

  const handleSend = async () => {
    if (!input.trim() || isLoading || !currentChatId) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: "user",
    }

    addMessage(currentChatId, userMessage)

    // Update chat title if this is the first user message
    const chat = chats.find((c) => c.id === currentChatId)
    if (chat && chat.messages.length === 1) {
      updateChatTitle(currentChatId, input.trim())
    }

    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...(chat?.messages || []), userMessage],
          chatState: chat?.chatState
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.message,
        role: "assistant",
      }
      
      addMessage(currentChatId, botMessage)
      if (data.chatState) {
        updateChatState(currentChatId, data.chatState)
      }
      
    } catch (error) {
      console.error('Error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I'm having trouble connecting right now. Please try again.",
        role: "assistant",
      }
      addMessage(currentChatId, errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar className="border-r border-zinc-800" collapsible="offcanvas" variant="sidebar">
        <SidebarHeader className="p-4">
          <Button
            onClick={createNewChat}
            className="w-full justify-start gap-2 bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-700"
            variant="outline"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-zinc-400">Recent Chats</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {chats.map((chat) => (
                  <SidebarMenuItem key={chat.id}>
                    <SidebarMenuButton
                      onClick={() => setCurrentChatId(chat.id)}
                      isActive={currentChatId === chat.id}
                      className="group justify-between text-zinc-300 hover:text-white hover:bg-zinc-800 data-[active=true]:bg-zinc-800 data-[active=true]:text-white"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <MessageSquare className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate text-sm">{chat.title}</span>
                      </div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteChat(chat.id)
                        }}
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 hover:bg-zinc-700 text-zinc-400 hover:text-red-400"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <SidebarInset className="flex flex-col h-screen bg-black text-white">
        {/* Header */}
        <header className="flex h-14 items-center gap-2 border-b border-zinc-800 px-4">
          <SidebarTrigger className="text-white hover:bg-zinc-800 -ml-1" />
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-white">{currentChat?.title || "Chat"}</h1>
          </div>
          {currentChat?.chatState?.stage === 'recommendations' && (
            <ExportPdfButton 
              messages={currentChat.messages} 
              chatState={currentChat.chatState} 
            />
          )}
          <div className="text-xs text-zinc-500 hidden md:block ml-2">Ctrl+B to toggle sidebar</div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto">
            {currentChat?.messages.map((message) => (
              <div
                key={message.id}
                className={`py-8 px-4 ${message.role === "assistant" ? "bg-black" : "bg-zinc-900"}`}
              >
                <div className="max-w-3xl mx-auto">
                  <div className="flex gap-6">
                    <div className="flex-shrink-0 w-8 h-8 rounded-sm bg-zinc-800 flex items-center justify-center text-sm font-medium">
                      {message.role === "assistant" ? "AI" : "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="prose prose-invert max-w-none">
                        <div 
                          className="text-white leading-7 [&>h1]:text-xl [&>h2]:text-lg [&>h3]:text-base [&>strong]:font-bold [&>ul]:list-disc [&>ul]:ml-4 [&>ol]:list-decimal [&>ol]:ml-4 [&>li]:mb-1 [&>p]:mb-2 [&>blockquote]:border-l-4 [&>blockquote]:border-gray-400 [&>blockquote]:pl-4"
                          dangerouslySetInnerHTML={{ __html: marked(message.content, { breaks: true }) }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="py-8 px-4 bg-black">
                <div className="max-w-3xl mx-auto">
                  <div className="flex gap-6">
                    <div className="flex-shrink-0 w-8 h-8 rounded-sm bg-zinc-800 flex items-center justify-center text-sm font-medium">
                      AI
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-zinc-500 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-zinc-500 rounded-full animate-pulse delay-75"></div>
                        <div className="w-2 h-2 bg-zinc-500 rounded-full animate-pulse delay-150"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-zinc-800">
          <div className="max-w-3xl mx-auto p-4">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message..."
                className="min-h-[60px] max-h-[200px] w-full resize-none bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-400 focus:border-zinc-600 focus:ring-0 pr-12 py-4"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="sm"
                className="absolute right-2 bottom-2 h-8 w-8 p-0 bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-700 disabled:text-zinc-400"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
