"use client"

import { Button } from "@/components/ui/button"
import { MessageSquare, MapPin, Sparkles, ArrowRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import Navbar from "@/components/navbar"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="bg-gradient-to-br from-black via-zinc-900 to-black">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
              AI Travel Assistant
            </h1>
            <p className="text-xl md:text-2xl text-zinc-300 mb-4 font-light">
              Intelligent Trip Planning with Cultural Intelligence
            </p>
            <p className="text-base text-zinc-400 max-w-3xl mx-auto">
              Powered by advanced LLMs and Qloo's Taste AI, we deliver personalized travel recommendations 
              that go beyond generic suggestions to discover authentic cultural experiences.
            </p>
          </div>

          {/* Key Innovation Highlight */}
          <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-6 mb-12">
            <div className="text-center">
              <h2 className="text-xl font-bold mb-3 text-blue-300">🏆 Hackathon Innovation</h2>
              <p className="text-base text-zinc-300 mb-4">
                First-of-its-kind integration combining conversational AI with Qloo's cross-domain cultural intelligence 
                to revolutionize travel discovery through privacy-first personalization.
              </p>
              <div className="grid md:grid-cols-2 gap-4 text-left">
                <div>
                  <h3 className="font-semibold text-green-400 mb-2">✨ LLM Enhancement</h3>
                  <p className="text-sm text-zinc-400">
                    Advanced prompt engineering with cultural context integration, 
                    multi-stage conversation flow, and intelligent fallback mechanisms.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-purple-400 mb-2">🎯 Qloo Integration</h3>
                  <p className="text-sm text-zinc-400">
                    Full API utilization with cross-domain affinities, real-time processing, 
                    and privacy-first approach without data storage.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Technology Stack */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-6 hover:border-blue-500/50 transition-colors">
              <MessageSquare className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-3 text-center">Intelligent LLM Integration</h3>
              <ul className="text-zinc-400 space-y-1 text-sm">
                <li>• Multi-stage conversation management</li>
                <li>• Context-aware prompt engineering</li>
                <li>• Cultural intelligence enhancement</li>
                <li>• Dynamic response adaptation</li>
              </ul>
            </div>
            
            <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-6 hover:border-purple-500/50 transition-colors">
              <Sparkles className="h-12 w-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-3 text-center">Qloo Taste AI Power</h3>
              <ul className="text-zinc-400 space-y-1 text-sm">
                <li>• Cross-domain cultural affinities</li>
                <li>• Privacy-first data processing</li>
                <li>• Real-time taste intelligence</li>
                <li>• Authentic venue discovery</li>
              </ul>
            </div>
            
            <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-6 hover:border-green-500/50 transition-colors">
              <MapPin className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-3 text-center">Production-Ready Tech</h3>
              <ul className="text-zinc-400 space-y-1 text-sm">
                <li>• Next.js 14 with TypeScript</li>
                <li>• Interactive mapping (Leaflet)</li>
                <li>• PDF export capabilities</li>
                <li>• Responsive design system</li>
              </ul>
            </div>
          </div>

          {/* What Makes This Special */}
          <div className="bg-zinc-900/30 border border-zinc-700 rounded-xl p-8 mb-16">
            <h2 className="text-3xl font-bold text-center mb-8">What Makes This Revolutionary?</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4 text-blue-400">🧠 Beyond Generic Recommendations</h3>
                <p className="text-zinc-300 mb-4">
                  While traditional travel apps rely on popularity metrics, we leverage Qloo's cultural intelligence 
                  to understand the deeper connections between your interests and authentic local experiences.
                </p>
                <p className="text-zinc-400 text-sm">
                  Example: Love jazz music? We'll find that hidden speakeasy in Paris that locals frequent, 
                  not just the tourist traps.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4 text-green-400">🔒 Privacy-First Innovation</h3>
                <p className="text-zinc-300 mb-4">
                  No personal data storage, no tracking cookies. Qloo's privacy-first approach means 
                  your preferences are processed in real-time without compromising your privacy.
                </p>
                <p className="text-zinc-400 text-sm">
                  Get personalized recommendations without the privacy concerns of traditional platforms.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center">
            <Link href="/chat">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                Experience Cultural Intelligence
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <p className="text-zinc-500 mt-3 text-sm">
              Free • No Registration Required • Privacy-First
            </p>
          </div>
        </div>
      </div>

      {/* Technical Architecture Diagrams */}
      <div className="border-t border-zinc-800 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-8">Technical Architecture</h2>
            <p className="text-xl text-zinc-400 text-center mb-16">
              Industry-quality implementation showcasing intelligent LLM-Qloo integration
            </p>
            
            {/* Architecture Flow Diagram */}
            <div className="mb-16">
              <div className="bg-zinc-900/50 border border-zinc-700 rounded-xl p-8">
                <h3 className="text-2xl font-semibold mb-6 text-center text-blue-400">
                  🔄 Intelligent Decision Flow
                </h3>
                <div className="flex justify-center mb-6">
                  <div className="bg-white rounded-lg p-4 max-w-md">
                    <Image
                      src="/architecture-flow.png"
                      alt="Architecture Flow Diagram showing LLM-Qloo integration"
                      width={400}
                      height={600}
                      className="w-full h-auto"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6 text-sm">
                  <div>
                    <h4 className="font-semibold text-green-400 mb-2">🧠 LLM Processing</h4>
                    <p className="text-zinc-400">
                      Extracts user preferences through natural conversation, then intelligently 
                      decides whether to enhance with Qloo data or generate fallback responses.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-purple-400 mb-2">🎯 Qloo Integration</h4>
                    <p className="text-zinc-400">
                      Cultural intelligence processing with cross-domain affinities, 
                      providing authentic recommendations when sufficient data is available.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Technical Architecture */}
            <div className="mb-16">
              <div className="bg-zinc-900/50 border border-zinc-700 rounded-xl p-8">
                <h3 className="text-2xl font-semibold mb-6 text-center text-green-400">
                  ⚡ End-to-End System Architecture
                </h3>
                <div className="flex justify-center mb-6">
                  <div className="bg-white rounded-lg p-4 max-w-2xl">
                    <Image
                      src="/technical-architecture.png"
                      alt="Detailed technical architecture showing conversation states and API integrations"
                      width={600}
                      height={800}
                      className="w-full h-auto"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-6 text-sm">
                  <div>
                    <h4 className="font-semibold text-blue-400 mb-2">🔄 Conversation States</h4>
                    <p className="text-zinc-400">
                      Multi-stage conversation management with intelligent state transitions 
                      from preference gathering to location selection to recommendations.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-purple-400 mb-2">🔗 API Integration</h4>
                    <p className="text-zinc-400">
                      Seamless integration with Qloo's Taste AI, Groq LLM, geocoding services, 
                      and image enrichment for comprehensive travel intelligence.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-400 mb-2">📱 User Experience</h4>
                    <p className="text-zinc-400">
                      Interactive map visualization, place cards with rich media, 
                      and PDF export capabilities for seamless trip planning.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Technical Innovations */}
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center font-bold text-2xl mx-auto mb-6">
                  1
                </div>
                <h3 className="text-xl font-semibold mb-4">LLM Conversation Engine</h3>
                <p className="text-zinc-400">
                  Advanced prompt engineering extracts nuanced preferences through natural conversation, 
                  building a comprehensive taste profile for Qloo processing.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center font-bold text-2xl mx-auto mb-6">
                  2
                </div>
                <h3 className="text-xl font-semibold mb-4">Qloo Cultural Intelligence</h3>
                <p className="text-zinc-400">
                  Your preferences are processed through Qloo's cross-domain affinities to discover 
                  unexpected connections and authentic cultural experiences.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center font-bold text-2xl mx-auto mb-6">
                  3
                </div>
                <h3 className="text-xl font-semibold mb-4">Intelligent Synthesis</h3>
                <p className="text-zinc-400">
                  LLM combines Qloo insights with location data, budget constraints, and contextual information 
                  to deliver personalized, actionable recommendations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-World Impact */}
      <div className="border-t border-zinc-800 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold mb-8">Real-World Application Potential</h2>
            <p className="text-xl text-zinc-300 mb-12">
              Addressing the $1.4T travel industry's personalization gap with scalable, privacy-first cultural intelligence.
            </p>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-3 text-blue-400">B2C Market Ready</h3>
                <p className="text-zinc-400 text-sm">
                  Direct consumer application with clear monetization through affiliate partnerships, 
                  premium features, and white-label solutions for travel agencies.
                </p>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-3 text-green-400">Enterprise Scalability</h3>
                <p className="text-zinc-400 text-sm">
                  API-first architecture enables integration with existing travel platforms, 
                  hospitality services, and cultural institutions worldwide.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
