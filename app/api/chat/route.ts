import { NextRequest, NextResponse } from 'next/server'

let groq: any = null
try {
  const { Groq } = require('groq-sdk')
  groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  })
} catch (error) {
  console.error('Groq SDK not available:', error)
}

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

async function generateAIResponse(prompt: string, interest?: string, location?: string): Promise<string> {
  if (!groq) {
    console.log('Groq SDK not available, using fallback response')
    return ""
  }

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an enthusiastic travel assistant helping users plan trips based on their interests, dont over explain or use unnecessary words. 
          ${interest ? `The user is interested in: ${interest}` : ''}
          ${location ? `The user wants to go to: ${location}` : ''}
          Be friendly, knowledgeable, and exciting about travel opportunities. Keep responses concise but engaging.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama3-8b-8192",
      temperature: 0.7,
      max_tokens: 1500
    })

    return chatCompletion.choices[0]?.message?.content || ""
  } catch (error) {
    console.error('Error generating AI response:', error)
    return ""
  }
}

// Updated extractLocation with prefix stripping and more flexible regex
function extractLocation(message: string, suggestedLocations: string[]): string | null {
  // Strip common prefixes to isolate potential location
  let cleanedMessage = message
    .replace(/^(i (would like|want) to (go to|visit)|let's (go to|visit)|go to)\s*/gi, '')
    .trim() // e.g., "i would like to go to Hanoi, Vietnam" -> "Hanoi, Vietnam"

  const lowerCleaned = cleanedMessage.toLowerCase()

  // Check for exact/partial match in suggestions
  for (const loc of suggestedLocations) {
    if (lowerCleaned.includes(loc.toLowerCase())) {
      return loc
    }
  }

  // Fallback: Extract city-like phrases (more flexible for city + optional country/comma)
  const cityMatch = cleanedMessage.match(/[A-Z][a-zA-Z\s]+(?:,\s*[A-Z][a-zA-Z\s]+)?/g)
  if (cityMatch && cityMatch.length > 0) {
    return cityMatch[0].trim() // e.g., "Hanoi, Vietnam" or "Hanoi"
  }
  return null
}

async function generateLocationSuggestionsWithAI(
  interest: string,
  excludedLocations: string[] = []
): Promise<{ locations: string[], response: string }> {
  if (!groq) {
    return {
      locations: ['London', 'Paris', 'New York'],
      response: `I can recommend London, Paris, New York. Where do you want to go?`
    }
  }

  try {
    const exclusionPrompt = excludedLocations.length > 0
      ? `Do not suggest these locations as they were previously rejected: ${excludedLocations.join(', ')}. Suggest different ones.`
      : ""

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a knowledgeable travel expert. Based on the user's interest, suggest 3 real cities/destinations that are genuinely known for that interest. Be specific and accurate. 
          ${exclusionPrompt}

          Format your response with proper markdown formatting:
          - Use **bold** for city names and important highlights
          - Use bullet points (-) for listing benefits or features
          - Use line breaks for better readability
          
          Structure: "Based on your interest in **[interest]**, I recommend these amazing destinations:

          **[City 1]** - [brief description]
          **[City 2]** - [brief description]  
          **[City 3]** - [brief description]

          [Brief explanation of why these places are perfect with bullet points if applicable]

          Where would you like to go?"`
        },
        {
          role: "user",
          content: `I'm interested in ${interest}. What are 3 real destinations that are famous for this?`
        }
      ],
      model: "llama3-8b-8192",
      temperature: 0.7,
      max_tokens: 500
    })

    // Extract cities from AI response - improved parsing
    const aiResponse = chatCompletion.choices[0]?.message?.content || ""

    // Try to extract cities from the structured response
    const cityMatches = aiResponse.match(/\*\*([^*]+)\*\*/g)
    let extractedCities = ['London', 'Paris', 'New York'] // fallback

    if (cityMatches && cityMatches.length >= 3) {
      extractedCities = cityMatches.slice(0, 3).map((match: string) => match.replace(/\*\*/g, ''))
    } else {
      // Fallback to basic parsing
      const basicMatches = aiResponse.match(/([A-Z][a-z\s]+(?:,[A-Z][a-z\s]+)*)/g)
      if (basicMatches && basicMatches.length > 0) {
        const possibleCities = basicMatches[0].split(',').map((city: string) => city.trim()).slice(0, 3)
        if (possibleCities.length >= 3) {
          extractedCities = possibleCities
        }
      }
    }

    return {
      locations: extractedCities,
      response: aiResponse
    }
  } catch (error) {
    console.error('Error generating location suggestions:', error)
    return {
      locations: ['London', 'Paris', 'New York'],
      response: `I can recommend London, Paris, New York. Where do you want to go?`
    }
  }
}


// New combined function for disagreement in location_selection
async function generateDisagreementResponseAndSuggestions(
  interest: string,
  excludedLocations: string[] = []
): Promise<{ acknowledgment: string; locations: string[]; suggestionsResponse: string }> {
  if (!groq) {
    return {
      acknowledgment: "I understand those suggestions weren't what you were looking for. Could you tell me more about what you're interested in?",
      locations: ["London", "Paris", "New York"],
      suggestionsResponse: `Here are some alternatives: London, Paris, New York. Where would you like to go?`,
    }
  }

  try {
    console.time("generateDisagreementResponseAndSuggestions") // For timing diagnostics

    const exclusionPrompt = excludedLocations.length > 0
      ? `Do not suggest these locations as they were previously rejected: ${excludedLocations.join(', ')}. Suggest different ones.`
      : ""

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a travel assistant. The user has disagreed with your previous location recommendations for ${interest}. 
          First, politely acknowledge their disagreement and ask them to clarify preferences (keep this concise, 1-2 sentences).
          Then, suggest 3 new real cities/destinations known for ${interest}. ${exclusionPrompt}
          
          Format your response exactly like this (use markdown):
          [Acknowledgment text here]
          
          Based on your interest in **${interest}**, here are some alternative destinations:
          
          **[City 1]** - [brief description]
          **[City 2]** - [brief description]
          **[City 3]** - [brief description]
          
          [Brief explanation if needed]
          
          Where would you like to go?`,
        },
        {
          role: "user",
          content: `I don't like the locations you suggested for ${interest}. Can you suggest others?`,
        },
      ],
      model: "llama3-8b-8192",
      temperature: 0.7,
      max_tokens: 400, // Reduced for faster response
    })

    const aiResponse = chatCompletion.choices[0]?.message?.content || ""

    // Parse the response: Split acknowledgment from suggestions
    const parts = aiResponse.split(/\n\nBased on your interest/) // Split on the structured header
    const acknowledgment = (parts[0] || "").trim()
    const suggestionsResponse = (parts[1] ? `Based on your interest${parts[1]}` : "").trim()

    // Extract cities (reuse your parsing logic)
    const cityMatches = suggestionsResponse.match(/\*\*([^*]+)\*\*/g)
    let extractedCities = ["London", "Paris", "New York"] // fallback
    if (cityMatches && cityMatches.length >= 3) {
      extractedCities = cityMatches
        .slice(0, 3)
        .map((match: string) => match.replace(/\*\*/g, ""))
    } else {
      // Fallback parsing
      const basicMatches = suggestionsResponse.match(
        /([A-Z][a-z\s]+(?:,[A-Z][a-z\s]+)*)/g
      )
      if (basicMatches && basicMatches.length > 0) {
        const possibleCities = basicMatches[0]
          .split(",")
          .map((city: string) => city.trim())
          .slice(0, 3)
        if (possibleCities.length >= 3) {
          extractedCities = possibleCities
        }
      }
    }

    console.timeEnd("generateDisagreementResponseAndSuggestions") // End timing

    return {
      acknowledgment,
      locations: extractedCities,
      suggestionsResponse,
    }
  } catch (error) {
    console.error('Error generating disagreement response and suggestions:', error)
    return {
      acknowledgment: "I understand those suggestions weren't what you were looking for. Could you tell me more about what you're interested in?",
      locations: ["London", "Paris", "New York"],
      suggestionsResponse: `Here are some alternatives: London, Paris, New York. Where would you like to go?`,
    }
  }
}


async function generateAIResponseIfUserDisagree(interest: string): Promise<string> { 
  if (!groq){ 
    return `I understand those suggestions weren't what you were looking for. Could you tell me more about what you're interested in for your trip? What activities or experiences would you prefer?`
  }
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system", 
          content: `You are a travel assistant. The user has disagreed with your previous recommendations for ${interest}. 
          Politely acknowledge their disagreement and ask them to clarify their preferences or interests. 
          Ask what specific activities, experiences, or types of places they're looking for. 
          Be helpful and encouraging. Keep the response concise and focused on understanding their needs better.`
        },
        {
          role: "user", 
          content: `I dont like what you suggested for ${interest}, can you suggest other things ?`
        }
      ],
      model: "llama3-8b-8192",
      temperature: 0.7,
      max_tokens: 300
    })

    return chatCompletion.choices[0]?.message?.content || `I understand those suggestions weren't what you were looking for. Could you tell me more about what you're interested in for your trip? What activities or experiences would you prefer?`
  } catch (error) {
    console.error('Error generating disagreement response:', error)
    return `I understand those suggestions weren't what you were looking for. Could you tell me more about what you're interested in for your trip? What activities or experiences would you prefer?`
  }
}



async function generateVenueRecommendationsWithAI(interest: string, location: string, venues: any[], budgetPerDay?: number): Promise<string> {
  if (!groq) {
    return `Here are some great places for ${interest} in ${location}:\n\n1. Popular venue in ${location}\n2. Local favorite spot\n3. Highly rated location\n4. Must-visit place\n5. Recommended by locals`
  }

  // If venues are empty (Qloo failed), return a fallback message instead of hallucinating
  if (venues.length === 0) {
    return `I couldn't find specific venue details for ${interest} in ${location} right now. Would you like suggestions for a different location or more details on your preferences?`
  }

  // Budget context for the LLM
  const budgetContext = budgetPerDay 
    ? `Budget: €${budgetPerDay}/day. Recommend a smart mix of budget-friendly and mid-range options. Include estimated costs (€) for each place.`
    : 'Include estimated costs (€) for each place when possible.'

  let attempts = 0
  const maxAttempts = 2

  while (attempts < maxAttempts) {
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are a local travel expert for ${location} ONLY. Create a detailed trip plan STRICTLY for ${location} and the interest in ${interest}. Do NOT mix in other locations or unrelated activities.

            ${venues.length > 0 ? `MUST use these real venues as the basis: ${venues.map(v => `${v.name} (${v.address})`).join(', ')}. Expand with genuine details but stay accurate.` : 'Use your knowledge to recommend real places, but keep it focused.'}

            ${budgetContext}

            Use proper markdown formatting:
            - **Bold** for venue names and important highlights
            - Use bullet points (-) for features, tips, and details
            - Clear numbering (1., 2., 3., etc.) for the main venues
            - Line breaks for better readability
            - Include **💰 Cost:** for each venue (e.g., "💰 Cost: €15-25 per person")

            Include:
            1. Top 5 real, specific venues/places in ${location} for ${interest}
            2. Brief description of each place with key features
            3. Estimated costs per person
            4. Practical tips or recommendations using bullet points
            5. Best times to visit

            Be specific with real place names, addresses when possible, and genuine local knowledge. Format as a well-structured numbered list with descriptions using markdown formatting. Stay on-topic—no hallucinations.

            IMPORTANT: Always complete your response. Do not stop mid-sentence. If you need to be brief, summarize but complete all 5 recommendations.`
          },
          {
            role: "user",
            content: `I'm interested in ${interest} and I'm going to ${location}. Give me a detailed trip plan with the top 5 real places I should visit, including specific venues, attractions, or experiences. ${budgetPerDay ? `My daily budget is €${budgetPerDay}.` : ''}`
          }
        ],
        model: "llama3-8b-8192",
        temperature: 0.7,
        max_tokens: 2000
      })

      const aiResponse = chatCompletion.choices[0]?.message?.content || ""

      // Check if response seems incomplete (ends abruptly or doesn't have proper ending)
      if (aiResponse && (aiResponse.match(/[.!?]$/) || aiResponse.length > 800)) {
        return aiResponse
      } else {
        console.warn(`AI response may be incomplete on attempt ${attempts + 1}:`, aiResponse)
        attempts++
        if (attempts >= maxAttempts) {
          return aiResponse || `Here are some great places for ${interest} in ${location}:\n\n1. Popular venue in ${location}\n2. Local favorite spot\n3. Highly rated location\n4. Must-visit place\n5. Recommended by locals`
        }
      }
    } catch (error) {
      console.error('Error generating venue recommendations:', error)
      attempts++
      if (attempts >= maxAttempts) {
        return `Here are some great places for ${interest} in ${location}:\n\n1. Popular venue in ${location}\n2. Local favorite spot\n3. Highly rated location\n4. Must-visit place\n5. Recommended by locals`
      }
    }
  }

  return `Here are some great places for ${interest} in ${location}:\n\n1. Popular venue in ${location}\n2. Local favorite spot\n3. Highly rated location\n4. Must-visit place\n5. Recommended by locals`
}

import { getUnsplashImages } from '@/lib/image-service';
import { PlaceImage } from '@/types/place';

// Fonction pour enrichir les lieux avec des images et des informations de prix
async function enrichPlacesWithImages(places: any[]): Promise<any[]> {
  if (!places || places.length === 0) return [];
  
  const enrichedPlaces = [];
  
  for (const place of places) {
    try {
      // Récupérer des images depuis Unsplash
      const images = await getUnsplashImages(
        place.name,
        place.address,
        place.category
      );
      
      // Ajouter les images au lieu
      enrichedPlaces.push({
        ...place,
        images
      });
    } catch (error) {
      console.error(`Erreur lors de l'enrichissement du lieu ${place.name} avec des images:`, error);
      // En cas d'erreur, ajouter le lieu sans images
      enrichedPlaces.push(place);
    }
  }
  
  return enrichedPlaces;
}

// Fonction pour extraire les informations de prix depuis la réponse LLM et enrichir les lieux
function enrichPlacesWithPricing(places: any[], aiResponse: string): any[] {
  if (!places || places.length === 0) return [];
  
  // Regex pour extraire les coûts (€15-25, €10, Cost: €20-30, etc.)
  const costRegex = /💰\s*Cost:\s*(€[\d\-€\s,]+)/gi;
  const costs = [];
  let match;
  
  while ((match = costRegex.exec(aiResponse)) !== null) {
    costs.push(match[1].trim());
  }
  
  // Fonction pour déterminer le niveau de prix basé sur le coût
  const getPriceLevel = (cost: string): 'budget' | 'mid' | 'high' => {
    const numbers = cost.match(/\d+/g);
    if (!numbers) return 'mid';
    
    const avgPrice = numbers.reduce((sum, num) => sum + parseInt(num), 0) / numbers.length;
    
    if (avgPrice <= 20) return 'budget';
    if (avgPrice <= 50) return 'mid';
    return 'high';
  };
  
  // Enrichir chaque lieu avec les informations de prix
  return places.map((place, index) => {
    const estimatedCost = costs[index] || null;
    const priceLevel = estimatedCost ? getPriceLevel(estimatedCost) : undefined;
    
    return {
      ...place,
      estimatedCost,
      priceLevel
    };
  });
}

async function getPlaceRecommendations(location: string, interest: string): Promise<any[]> {
  try {
    console.time('getPlaceRecommendations') // Timing diagnostic

    // Add 5s timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Qloo API timeout')), 155000)
    )

    const apiPromise = (async () => {
      // Try to get real recommendations from Qloo API
      const qloo_url = process.env.QLOO_API_URL || 'https://hackathon.api.qloo.com'
      const qloo_key = process.env.QLOO_API_KEY

      if (!qloo_key) {
        console.log('No Qloo API key found, using fallback')
        return []
      }

      // Map interests to potential Qloo tags or search strategies
      const interestMapping: { [key: string]: string[] } = {
        'food': ['restaurant', 'dining', 'cuisine'],
        'pizza': ['pizza', 'italian', 'restaurant'],
        'coffee': ['coffee', 'cafe', 'espresso'],
        'art': ['museum', 'gallery', 'art'],
        'music': ['venue', 'concert', 'music'],
        'shopping': ['shop', 'retail', 'store'],
        'nightlife': ['bar', 'club', 'entertainment'],
        'sports': ['stadium', 'arena', 'sports'],
        'football': ['stadium', 'sports', 'football'],
        'basketball': ['arena', 'sports', 'basketball'],
        'history': ['museum', 'historical', 'monument'],
        'guns': ['shooting', 'range', 'outdoor'],
        'fitness': ['gym', 'fitness', 'health'],
        'nature': ['park', 'outdoor', 'nature']
      }

      // Construct the API URL with location and interest-based filtering
      const encodedLocation = encodeURIComponent(location)
      let apiUrl = `${qloo_url}/v2/insights/?filter.type=urn:entity:place&filter.location.query=${encodedLocation}&limit=10`

      console.log('Calling Qloo API:', apiUrl)

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'X-Api-Key': qloo_key,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.error('Qloo API error:', response.status, response.statusText)
        const errorText = await response.text()
        console.error('Error details:', errorText)
        return []
      }

      const data = await response.json()
      console.log('Qloo API response:', data)

      // Extract places from the response
      if (data.results && data.results.entities && Array.isArray(data.results.entities)) {
        const places = data.results.entities.slice(0, 5).map((place: any) => ({
          name: place.name || 'Unknown Place',
          rating: place.properties?.business_rating || place.popularity || 4.0,
          address: place.properties?.address || place.disambiguation || '',
          description: place.properties?.description || '',
          id: place.entity_id || place.id,
          category: place.properties?.category || place.subtype || '',
          website: place.properties?.website || '',
          phone: place.properties?.phone || '',
          keywords: place.properties?.keywords?.map((k: any) => k.name).join(', ') || ''
        }))

        // Filter places based on interest if we have results
        const lowerInterest = interest.toLowerCase()
        const relevantPlaces = places.filter((place: any) => {
          const searchText = `${place.name} ${place.description} ${place.category} ${place.keywords}`.toLowerCase()
          return interestMapping[lowerInterest]?.some(keyword => searchText.includes(keyword)) ||
            searchText.includes(lowerInterest)
        })

        // Enrichir les lieux avec des images
        const placesToUse = relevantPlaces.length > 0 ? relevantPlaces : places
        const enrichedPlaces = await enrichPlacesWithImages(placesToUse)
        
        return enrichedPlaces
      }

      return []
    })()

    const data = await Promise.race([apiPromise, timeoutPromise]) as any[]

    console.timeEnd('getPlaceRecommendations')

    if (data.length === 0) {
      console.warn(`Qloo returned empty results for location: ${location}, interest: ${interest}`)
    }
    return data
  } catch (error) {
    console.error('Qloo API error or timeout:', error)
    console.timeEnd('getPlaceRecommendations')
    return [] // Fast fallback to empty
  }
}

// PDF generation is now handled client-side with jsPDF

export async function POST(request: NextRequest) {
  try {
    const { messages, chatState, exportPdf, tripDetails } = await request.json()

    // PDF export is now handled client-side
    if (exportPdf === true) {
      return NextResponse.json(
        { error: 'PDF export is now handled client-side' },
        { status: 400 }
      );
    }

    // Regular chat processing
    const lastMessage = messages[messages.length - 1]
    const currentState: ChatState = chatState || {
      stage: 'initial',
      userPreferences: [],
      selectedLocation: null,
      suggestedLocations: []
    }

    let responseMessage = ""
    let newState = { ...currentState }
    let placesData = []

    if (currentState.stage === 'initial') {
      const aiWelcome = await generateAIResponse(
        "Greet the user and ask what they like or are interested in for their trip planning. Be enthusiastic and welcoming."
      )
      responseMessage = aiWelcome || "What do you like?"
      newState.stage = 'preference_gathering'
    } else if (currentState.stage === 'preference_gathering') {
      const interest = lastMessage.content.toLowerCase()
      newState.userPreferences = [interest]

      const aiSuggestions = await generateLocationSuggestionsWithAI(interest)
      newState.suggestedLocations = aiSuggestions.locations
      newState.stage = 'location_selection'

      responseMessage = aiSuggestions.response
    } else if (currentState.stage === 'location_selection') {
      const userMessage = lastMessage.content.toLowerCase().trim()
      const interest = currentState.userPreferences[0] || ""
      
      // Stricter disagreement check using regex for whole phrases/words to avoid false positives
      const disagreementPatterns = [
        /\bno\b/i,
        /\bdon't? like\b/i, // Matches "dont like" or "don't like" as whole
        /\bnot interested\b/i,
        /\bdisagree\b/i,
        /\bdifferent\b/i,
        /\bother\b/i,
        /\bsomething else\b/i,
        /\bnot good\b/i,
        /\bhate\b/i,
        /\bnot what i want\b/i,
      ]
      const isDisagreeing = disagreementPatterns.some((pattern) =>
        pattern.test(userMessage)
      )
      
      if (isDisagreeing) {
        // Acknowledge disagreement and regenerate new locations in ONE API call
        console.log('User disagreed with locations; regenerating new suggestions.')
        
        const combinedResponse = await generateDisagreementResponseAndSuggestions(
          interest,
          currentState.suggestedLocations // Pass excluded locations
        )
        
        newState.suggestedLocations = combinedResponse.locations
        responseMessage = combinedResponse.acknowledgment + '\n\n' + combinedResponse.suggestionsResponse
        
        // Stay in location_selection to await selection
        newState.stage = 'location_selection'
      } else {
        // Not disagreeing: Try to extract location
        const extractedLoc = extractLocation(lastMessage.content, currentState.suggestedLocations)
        
        if (extractedLoc) {
          // Valid location extracted: Proceed to recommendations
          console.log(`Extracted location: ${extractedLoc}; proceeding to recommendations.`)
          newState.selectedLocation = extractedLoc
          newState.stage = 'recommendations'

          placesData = await getPlaceRecommendations(extractedLoc, interest)
          
          // Calculate budget per day from trip details
          let budgetPerDay: number | undefined
          
          if (tripDetails?.budget && tripDetails?.startDate && tripDetails?.endDate) {
            const startDate = new Date(tripDetails.startDate)
            const endDate = new Date(tripDetails.endDate)
            const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            budgetPerDay = Math.round(tripDetails.budget / diffDays)
          }
          
          responseMessage = await generateVenueRecommendationsWithAI(interest, extractedLoc, placesData, budgetPerDay)
          
          // Enrichir les lieux avec les informations de prix extraites de la réponse LLM
          placesData = enrichPlacesWithPricing(placesData, responseMessage)

          // If response indicates Qloo fallback (starts with "I couldn't find"), reset stage to location_selection
          if (responseMessage.startsWith("I couldn't find")) {
            newState.stage = 'location_selection'
          }
        } else {
          // No location: Treat as preference refinement
          console.log('User refining preferences; updating interest and regenerating suggestions.')
          // Clean the message before appending (remove common phrases)
          let cleanedRefinement = lastMessage.content
            .replace(/i (would like|want) to (go|visit)/gi, '')
            .trim()
          const updatedInterest = `${interest} ${cleanedRefinement}`.trim()
          newState.userPreferences = [updatedInterest]

          const newSuggestions = await generateLocationSuggestionsWithAI(
            updatedInterest,
            currentState.suggestedLocations // Exclude previous
          )
          newState.suggestedLocations = newSuggestions.locations
          responseMessage = newSuggestions.response

          // Stay in location_selection
          newState.stage = 'location_selection'
        }
      }
    } else if (currentState.stage === 'recommendations') {
      // Handle user disagreement with recommendations
      const userMessage = lastMessage.content.toLowerCase()
      const interest = currentState.userPreferences[0]
      
      // Check if user is disagreeing with recommendations
      const disagreementKeywords = ['no', 'dont like', 'not interested', 'disagree', 'different', 'other', 'something else', 'not good', 'hate']
      const isDisagreeing = disagreementKeywords.some(keyword => userMessage.includes(keyword))
      
      if (isDisagreeing) {
        responseMessage = await generateAIResponseIfUserDisagree(interest)
        // Reset to preference gathering to allow them to specify new interests or preferences
        newState.stage = 'preference_gathering'
        newState.userPreferences = []
        newState.selectedLocation = null
        newState.suggestedLocations = []
      } else {
        // If not disagreeing, treat as new conversation
        const aiReset = await generateAIResponse(
          "The user wants to start a new conversation. Politely ask what they like or are interested in for their next trip."
        )
        responseMessage = aiReset || "What do you like?"
        newState = {
          stage: 'preference_gathering',
          userPreferences: [],
          selectedLocation: null,
          suggestedLocations: []
        }
      }
    } else {
      const aiReset = await generateAIResponse(
        "The user wants to start a new conversation. Politely ask what they like or are interested in for their next trip."
      )
      responseMessage = aiReset || "What do you like?"
      newState = {
        stage: 'preference_gathering',
        userPreferences: [],
        selectedLocation: null,
        suggestedLocations: []
      }
    }

    return NextResponse.json({
      message: responseMessage,
      chatState: newState,
      places: placesData,
      canExportPdf: newState.stage === 'recommendations' // Only enable PDF export when we have recommendations
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}
