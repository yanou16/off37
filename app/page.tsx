"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Send, Plus, MessageSquare, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { marked } from "marked"
import ExportPdfButton from "@/components/export-pdf-button"
import InteractiveMap from "@/components/interactive-map"
import PlaceCard from "@/components/place-card"

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

interface TripDetails {
  budget: number | null
  startDate: string
  endDate: string
}

interface Chat {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
  chatState?: ChatState
  tripDetails?: TripDetails
}

export default function ChatbotInterface() {
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [places, setPlaces] = useState<any[]>([])
  const [showTripModal, setShowTripModal] = useState(false)
  const [pendingChatId, setPendingChatId] = useState<string | null>(null)
  const [initializedChats, setInitializedChats] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load chats and initialized chat IDs from localStorage on mount
  useEffect(() => {
    const savedChats = localStorage.getItem("chatbot-chats")
    const savedInitializedChats = localStorage.getItem("chatbot-initialized-chats")
    
    let initializedSet = new Set<string>()
    
    // Load initialized chat IDs
    if (savedInitializedChats) {
      try {
        const parsedInitialized = JSON.parse(savedInitializedChats)
        initializedSet = new Set(parsedInitialized)
      } catch (error) {
        console.error('Error parsing initialized chats:', error)
      }
    }
    
    if (savedChats) {
      const parsedChats = JSON.parse(savedChats).map((chat: any) => ({
        ...chat,
        createdAt: new Date(chat.createdAt),
        updatedAt: new Date(chat.updatedAt),
      }))
      
      // Mark all existing chats as initialized (they already exist, so no modal needed)
      const existingChatIds = parsedChats.map((chat: Chat) => chat.id)
      existingChatIds.forEach(id => initializedSet.add(id))
      
      setChats(parsedChats)
      setInitializedChats(initializedSet)
      
      if (parsedChats.length > 0) {
        setCurrentChatId(parsedChats[0].id)
      }
    } else {
      // No existing chats, create initial one
      setInitializedChats(initializedSet)
      const initialChatId = Date.now().toString()
      setPendingChatId(initialChatId)
      setShowTripModal(true)
    }
  }, [])

  // Save chats to localStorage whenever chats change
  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem("chatbot-chats", JSON.stringify(chats))
    }
  }, [chats])

  // Save initialized chats to localStorage whenever initializedChats changes
  useEffect(() => {
    localStorage.setItem("chatbot-initialized-chats", JSON.stringify(Array.from(initializedChats)))
  }, [initializedChats])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chats, currentChatId])

  const createNewChat = () => {
    const newChatId = Date.now().toString()
    setPendingChatId(newChatId)
    setShowTripModal(true)
  }

  const handleTripDetailsSubmit = (tripDetails: TripDetails) => {
    if (!pendingChatId) return

    const newChat: Chat = {
      id: pendingChatId,
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
      },
      tripDetails
    }

    // Mark this chat as initialized
    setInitializedChats(prev => new Set([...prev, pendingChatId]))
    
    setChats((prev) => [newChat, ...prev])
    setCurrentChatId(newChat.id)
    setShowTripModal(false)
    setPendingChatId(null)
  }

  const handleModalClose = () => {
    setShowTripModal(false)
    setPendingChatId(null)
  }

  const deleteChat = (chatId: string) => {
    // Remove from initialized chats tracking
    setInitializedChats(prev => {
      const newSet = new Set(prev)
      newSet.delete(chatId)
      return newSet
    })
    
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
      // Revenir à l'API principale
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...(chat?.messages || []), userMessage],
          chatState: chat?.chatState,
          tripDetails: chat?.tripDetails
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
      
      // Stocker les données des lieux pour la carte
      if (data.places && Array.isArray(data.places)) {
        setPlaces(data.places)
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

  // Trip Planning Modal Component
  const TripPlanningModal = () => {
    const [budget, setBudget] = useState<number | null>(null)
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")

    // Get today's date in YYYY-MM-DD format for validation
    const today = new Date().toISOString().split('T')[0]

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      
      // Additional validation before submit
      if (!budget || budget <= 0) {
        alert("Veuillez entrer un budget valide supérieur à 0€")
        return
      }
      
      if (new Date(startDate) < new Date(today)) {
        alert("La date de début ne peut pas être dans le passé")
        return
      }
      
      if (new Date(endDate) < new Date(startDate)) {
        alert("La date de fin doit être après la date de début")
        return
      }
      
      handleTripDetailsSubmit({
        budget,
        startDate,
        endDate
      })
    }

    const isFormValid = budget && budget > 0 && startDate && endDate && 
                       new Date(startDate) >= new Date(today) && 
                       new Date(startDate) <= new Date(endDate)

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-zinc-900 rounded-lg p-6 w-full max-w-md border border-zinc-700">
          <h2 className="text-xl font-semibold text-white mb-6">Plan Your Trip</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="budget" className="block text-sm font-medium text-zinc-300 mb-2">
                Budget (€)
              </label>
              <input
                type="number"
                id="budget"
                value={budget || ""}
                onChange={(e) => setBudget(e.target.value ? Number(e.target.value) : null)}
                placeholder="Enter your budget"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
              />
            </div>

            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-zinc-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                min={today}
              />
            </div>

            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-zinc-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                min={startDate || today}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                onClick={handleModalClose}
                variant="outline"
                className="flex-1 border-zinc-600 text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isFormValid}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-zinc-700 disabled:text-zinc-400"
              >
                Confirm and Start Chat
              </Button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Trip Summary Component
  const TripSummary = ({ tripDetails }: { tripDetails: TripDetails }) => {
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    }

    const calculateDays = () => {
      const start = new Date(tripDetails.startDate)
      const end = new Date(tripDetails.endDate)
      const diffTime = Math.abs(end.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays
    }

    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 mb-4">
        <div className="flex flex-wrap gap-4 text-sm">
          {tripDetails.budget && (
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">Budget:</span>
              <span className="text-white font-medium">€{tripDetails.budget.toLocaleString()}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Dates:</span>
            <span className="text-white font-medium">
              {formatDate(tripDetails.startDate)} - {formatDate(tripDetails.endDate)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Duration:</span>
            <span className="text-white font-medium">{calculateDays()} days</span>
          </div>
        </div>
      </div>
    )
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
              places={places}
            />
          )}
          <div className="text-xs text-zinc-500 hidden md:block ml-2">Ctrl+B to toggle sidebar</div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto">
            {/* Trip Summary */}
            {currentChat?.tripDetails && (
              <div className="px-4 pt-4">
                <TripSummary tripDetails={currentChat.tripDetails} />
              </div>
            )}
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

            {/* Carte interactive */}
            {currentChat?.chatState?.stage === 'recommendations' && places.length > 0 && (
              <div className="py-4 px-4 bg-black">
                <div className="max-w-3xl mx-auto">
                  <h2 className="text-xl font-semibold mb-4 text-white">Carte des lieux recommandés</h2>
                  <InteractiveMap 
                    location={currentChat.chatState.selectedLocation || ''} 
                    places={places} 
                  />
                </div>
              </div>
            )}
            
            {/* Lieux recommandés avec images */}
            {currentChat?.chatState?.stage === 'recommendations' && places.length > 0 && (
              <div className="py-4 px-4 bg-black">
                <div className="max-w-3xl mx-auto">
                  <h2 className="text-xl font-semibold mb-4 text-white">Lieux recommandés</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {places.map((place, index) => (
                      <PlaceCard key={place.id || index} place={place} index={index} />
                    ))}
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

      {/* Trip Planning Modal */}
      {showTripModal && <TripPlanningModal />}
    </SidebarProvider>
  )
}
