"use client"

import { Button } from "@/components/ui/button"
import { MessageSquare, MapPin, Sparkles, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="h-8 w-8 text-blue-400" />
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                AI Travel Assistant
              </h1>
            </div>
            <p className="text-xl md:text-2xl text-zinc-300 mb-8">
              Planifiez votre voyage parfait avec l'intelligence artificielle
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-6">
              <MessageSquare className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Chat Intelligent</h3>
              <p className="text-zinc-400">
                Conversez naturellement avec notre IA pour découvrir vos préférences de voyage
              </p>
            </div>
            
            <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-6">
              <MapPin className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Recommandations Personnalisées</h3>
              <p className="text-zinc-400">
                Obtenez des suggestions uniques basées sur vos goûts et votre budget
              </p>
            </div>
            
            <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-6">
              <Sparkles className="h-12 w-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Intelligence Culturelle</h3>
              <p className="text-zinc-400">
                Découvrez des lieux authentiques grâce à notre technologie Qloo
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <div className="space-y-4">
            <Link href="/chat">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                Commencer mon voyage
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <p className="text-sm text-zinc-500">
              Gratuit • Aucune inscription requise
            </p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="border-t border-zinc-800 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-12">Comment ça marche ?</h2>
            
            <div className="space-y-8">
              <div className="flex items-center gap-4 text-left">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Partagez vos goûts</h3>
                  <p className="text-zinc-400">Dites-nous ce que vous aimez : cuisine, culture, activités...</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-left">
                <div className="flex-shrink-0 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Choisissez votre destination</h3>
                  <p className="text-zinc-400">Notre IA vous propose des destinations qui correspondent à vos préférences</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-left">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Découvrez des lieux uniques</h3>
                  <p className="text-zinc-400">Recevez des recommandations personnalisées avec carte interactive</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
