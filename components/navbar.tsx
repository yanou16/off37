"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sparkles, MessageSquare, Home } from "lucide-react"

export default function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-zinc-800 bg-black/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Sparkles className="h-6 w-6 text-blue-400" />
            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              AI Travel Assistant
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button
                variant={pathname === "/" ? "default" : "ghost"}
                size="sm"
                className={`flex items-center gap-2 ${
                  pathname === "/" 
                    ? "bg-blue-600 hover:bg-blue-700 text-white" 
                    : "text-zinc-300 hover:text-white hover:bg-zinc-800"
                }`}
              >
                <Home className="h-4 w-4" />
                Home
              </Button>
            </Link>
            
            <Link href="/chat">
              <Button
                variant={pathname === "/chat" ? "default" : "ghost"}
                size="sm"
                className={`flex items-center gap-2 ${
                  pathname === "/chat" 
                    ? "bg-blue-600 hover:bg-blue-700 text-white" 
                    : "text-zinc-300 hover:text-white hover:bg-zinc-800"
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                Chat
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}