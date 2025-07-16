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
      max_tokens: 600
    })

    return chatCompletion.choices[0]?.message?.content || ""
  } catch (error) {
    console.error('Error generating AI response:', error)
    return ""
  }
}

async function generateLocationSuggestionsWithAI(interest: string): Promise<{ locations: string[], response: string }> {
  if (!groq) {
    return {
      locations: ['London', 'Paris', 'New York'],
      response: `I can recommend London, Paris, New York. Where do you want to go?`
    }
  }

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a knowledgeable travel expert. Based on the user's interest, suggest 3 real cities/destinations that are genuinely known for that interest. Be specific and accurate. 

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

async function generateVenueRecommendationsWithAI(interest: string, location: string, venues: any[]): Promise<string> {
  if (!groq) {
    return `Here are some great places for ${interest} in ${location}:\n\n1. Popular venue in ${location}\n2. Local favorite spot\n3. Highly rated location\n4. Must-visit place\n5. Recommended by locals`
  }

  let attempts = 0
  const maxAttempts = 2

  while (attempts < maxAttempts) {
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are a local travel expert for ${location}. Create a detailed trip plan for someone interested in ${interest}. 

            ${venues.length > 0 ? `Use these real venues from our database as a starting point: ${venues.map(v => `${v.name} (${v.address})`).join(', ')}. You can mention additional places too.` : 'Use your knowledge to recommend real places.'}

            Use proper markdown formatting:
            - **Bold** for venue names and important highlights
            - Use bullet points (-) for features, tips, and details
            - Clear numbering (1., 2., 3., etc.) for the main venues
            - Line breaks for better readability

            Include:
            1. Top 5 real, specific venues/places in ${location} for ${interest}
            2. Brief description of each place with key features
            3. Practical tips or recommendations using bullet points
            4. Best times to visit

            Be specific with real place names, addresses when possible, and genuine local knowledge. Format as a well-structured numbered list with descriptions using markdown formatting.

            IMPORTANT: Always complete your response. Do not stop mid-sentence. If you need to be brief, summarize but complete all 5 recommendations.`
          },
          {
            role: "user",
            content: `I'm interested in ${interest} and I'm going to ${location}. Give me a detailed trip plan with the top 5 real places I should visit, including specific venues, attractions, or experiences.`
          }
        ],
        model: "llama3-8b-8192",
        temperature: 0.7,
        max_tokens: 1000
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

async function getPlaceRecommendations(location: string, interest: string): Promise<any[]> {
  try {
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
      
      return relevantPlaces.length > 0 ? relevantPlaces : places
    }

    return []
  } catch (error) {
    console.error('Error calling Qloo API:', error)
    return []
  }
}

export async function POST(request: NextRequest) {
  try {
    const { messages, chatState } = await request.json()
    
    const lastMessage = messages[messages.length - 1]
    const currentState: ChatState = chatState || {
      stage: 'initial',
      userPreferences: [],
      selectedLocation: null,
      suggestedLocations: []
    }
    
    let responseMessage = ""
    let newState = { ...currentState }
    
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
      const selectedLocation = lastMessage.content.trim()
      newState.selectedLocation = selectedLocation
      newState.stage = 'recommendations'
      
      const interest = currentState.userPreferences[0]
      const places = await getPlaceRecommendations(selectedLocation, interest)
      
      responseMessage = await generateVenueRecommendationsWithAI(interest, selectedLocation, places)
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
      chatState: newState
    })
    
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}
