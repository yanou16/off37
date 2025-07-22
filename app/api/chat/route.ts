import { NextRequest, NextResponse } from 'next/server';
import { extractPlacesFromAIResponse, geocodePlaces } from '@/lib/place-extractor';
import { getUnsplashImages } from '@/lib/image-service';

let groq: any = null;
try {
  const { Groq } = require('groq-sdk');
  groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });
} catch (error) {
  console.error('Groq SDK not available:', error);
}

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
}

interface ChatState {
  stage: 'initial' | 'preference_gathering' | 'location_selection' | 'recommendations' | 'test';
  userPreferences: string[];
  selectedLocation: string | null;
  suggestedLocations: string[];
}

// Fonction pour générer une réponse AI
async function generateAIResponse(prompt: string, interest?: string, location?: string): Promise<string> {
  if (!groq) {
    console.log('Groq SDK not available, using fallback response');
    return "I'm sorry, I can't process your request right now. Please try again later.";
  }

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an enthusiastic travel assistant helping users plan trips based on their interests. 
          ${interest ? `The user is interested in: ${interest}` : ''}
          ${location ? `The user wants to go to: ${location}` : ''}
          Be friendly, knowledgeable, and exciting about travel opportunities.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama3-8b-8192",
      temperature: 0.7,
      max_tokens: 1000
    });

    return chatCompletion.choices[0]?.message?.content || "";
  } catch (error) {
    console.error('Error generating AI response:', error);
    return "I'm sorry, I couldn't generate a response. Please try again.";
  }
}

// Fonction robuste pour extraire la localisation du message de l'utilisateur
function extractLocation(message: string, suggestedLocations: string[]): string | null {
  // Normaliser le message de l'utilisateur
  const userMessageLower = message.toLowerCase().trim();

  // Créer des versions normalisées des suggestions pour la comparaison
  const normalizedSuggestions = suggestedLocations.map(location => ({
    original: location,
    normalized: location.toLowerCase().trim(),
    city: location.split(',')[0].trim().toLowerCase(),
    parts: location.toLowerCase().split(/[\s,]+/).filter(part => part.length > 1)
  }));

  // 1. Vérifier les correspondances exactes
  for (const location of normalizedSuggestions) {
    if (userMessageLower === location.normalized) {
      console.log(`🎯 Location Intelligence: Exact match found - "${userMessageLower}" → "${location.original}"`);
      return location.original;
    }
  }

  // 2. Vérifier si le message contient la suggestion complète
  for (const location of normalizedSuggestions) {
    if (userMessageLower.includes(location.normalized)) {
      console.log(`Full inclusion match: "${userMessageLower}" includes "${location.original}"`);
      return location.original;
    }
  }

  // 3. Vérifier si le message contient uniquement le nom de la ville
  for (const location of normalizedSuggestions) {
    if (userMessageLower.includes(location.city)) {
      console.log(`City name match: "${userMessageLower}" includes city "${location.city}" from "${location.original}"`);
      return location.original;
    }
  }

  // 4. Vérifier si le message contient une partie significative de la suggestion
  for (const location of normalizedSuggestions) {
    // Calculer combien de parties de la suggestion sont présentes dans le message
    const matchingParts = location.parts.filter(part => userMessageLower.includes(part));
    if (matchingParts.length >= Math.ceil(location.parts.length / 2)) {
      console.log(`Partial match: "${userMessageLower}" matches parts ${matchingParts.join(', ')} from "${location.original}"`);
      return location.original;
    }
  }

  // 5. Vérifier les correspondances approximatives (distance de similarité)
  // Cette fonction calcule un score de similarité simple entre deux chaînes
  const calculateSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    // Si la chaîne plus courte est vide, la similarité est 0
    if (shorter.length === 0) return 0;

    // Compter combien de caractères de la chaîne plus courte sont dans la chaîne plus longue
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter[i])) matches++;
    }

    return matches / longer.length;
  };

  // Trouver la suggestion avec la plus grande similarité
  let bestMatch: { location: string, similarity: number } | null = null;

  for (const location of normalizedSuggestions) {
    const similarity = calculateSimilarity(userMessageLower, location.normalized);
    if (similarity > 0.5 && (!bestMatch || similarity > bestMatch.similarity)) {
      bestMatch = { location: location.original, similarity };
    }

    // Vérifier aussi la similarité avec juste le nom de la ville
    const citySimilarity = calculateSimilarity(userMessageLower, location.city);
    if (citySimilarity > 0.7 && (!bestMatch || citySimilarity > bestMatch.similarity)) {
      bestMatch = { location: location.original, similarity: citySimilarity };
    }
  }

  if (bestMatch) {
    console.log(`Similarity match: "${userMessageLower}" has similarity ${bestMatch.similarity.toFixed(2)} with "${bestMatch.location}"`);
    return bestMatch.location;
  }

  // Aucune correspondance trouvée
  console.log(`No location match found for "${userMessageLower}" in suggestions: ${suggestedLocations.join(', ')}`);
  return null;
}

// Fonction améliorée pour extraire les villes d'un texte
function extractCitiesFromText(text: string): string[] {
  const matches = [];

  console.log('Extracting cities from text:', text.substring(0, 500)); // Debug log

  // Méthode 1: Rechercher des motifs spécifiques au début de ligne ou après des numéros
  // Pattern pour "1. City, Country:" ou "City, Country:" au début d'une ligne
  const lineStartPattern = /(?:^|\n)(?:\d+\.\s*)?([A-Z][a-zA-Z\s]+),\s*([A-Z][a-zA-Z\s]+):/gm;
  let match;

  while ((match = lineStartPattern.exec(text)) !== null) {
    const city = match[1].trim();
    const country = match[2].trim();
    const fullLocation = `${city}, ${country}`;
    console.log(`Found line-start city-country match: "${fullLocation}"`); // Debug log
    matches.push(fullLocation);
  }

  // Méthode 2: Si pas assez trouvé, chercher des patterns "City, Country" généraux
  if (matches.length < 3) {
    const generalPattern = /\b([A-Z][a-zA-Z\s]{2,15}),\s*([A-Z][a-zA-Z\s]{2,15})\b/g;

    while ((match = generalPattern.exec(text)) !== null) {
      const city = match[1].trim();
      const country = match[2].trim();
      const fullLocation = `${city}, ${country}`;

      // Éviter les doublons et filtrer les faux positifs
      if (!matches.some(m => m === fullLocation) &&
        !city.includes('for') && !city.includes('and') &&
        !country.includes('for') && !country.includes('and') &&
        city.length > 2 && country.length > 2) {
        console.log(`Found general city-country match: "${fullLocation}"`); // Debug log
        matches.push(fullLocation);
      }
    }
  }

  // Méthode 3: Si toujours pas assez, chercher des noms de villes simples
  if (matches.length < 3) {
    const cityPattern = /\b([A-Z][a-zA-Z]{3,15}(?:\s+[A-Z][a-zA-Z]{3,15})?)\b/g;
    const commonWords = ['The', 'And', 'For', 'With', 'Visit', 'Try', 'Enjoy', 'Based', 'Known', 'Famous', 'Great', 'Amazing', 'Best', 'Top', 'Popular', 'Local', 'Historic', 'Cultural', 'Traditional'];

    while ((match = cityPattern.exec(text)) !== null) {
      const city = match[1].trim();

      // Éviter les doublons et les mots communs
      if (!matches.some(m => m.startsWith(city)) &&
        !commonWords.includes(city) &&
        city.length > 3) {
        console.log(`Found city match: "${city}"`); // Debug log
        matches.push(city);
      }
    }
  }

  console.log('Final extracted cities:', matches); // Debug log
  return matches.slice(0, 3); // Retourner au maximum 3 villes
}

// Fonction pour générer des suggestions de localisation
async function generateLocationSuggestions(interest: string): Promise<{ locations: string[], response: string }> {
  const defaultLocations = ['Paris, France', 'London, UK', 'New York, USA'];
  const defaultResponse = `Based on your interest in ${interest}, I recommend these amazing destinations: Paris, London, and New York. Where would you like to go?`;

  if (!groq) {
    return {
      locations: defaultLocations,
      response: defaultResponse
    };
  }

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a knowledgeable travel expert. Based on the user's interest, suggest 3 real cities/destinations that are genuinely known for that interest.
          
          IMPORTANT: Format each suggestion as "City, Country" (e.g., "Paris, France").
          
          Be specific and accurate. Make sure to include both the city name and country name for each suggestion.`
        },
        {
          role: "user",
          content: `I'm interested in ${interest}. What are 3 real destinations that are famous for this?`
        }
      ],
      model: "llama3-8b-8192",
      temperature: 0.7,
      max_tokens: 500
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content || defaultResponse;
    console.log(`🤖 LLM Generated location suggestions based on interest: ${interest}`);

    // Extraction améliorée des villes
    const extractedCities = extractCitiesFromText(aiResponse);
    console.log(`Extracted cities: ${JSON.stringify(extractedCities)}`);

    // Si nous n'avons pas trouvé assez de villes, utiliser les valeurs par défaut
    const locationsToUse = extractedCities.length >= 1 ? extractedCities : defaultLocations;
    console.log(`Using locations: ${JSON.stringify(locationsToUse)}`);

    return {
      locations: locationsToUse,
      response: aiResponse
    };
  } catch (error) {
    console.error('Error generating location suggestions:', error);
    return {
      locations: defaultLocations,
      response: defaultResponse
    };
  }
}

// Fonction pour obtenir des lieux depuis l'API Qloo
async function getPlaceRecommendations(location: string, interest: string): Promise<any[]> {
  try {
    console.time('getPlaceRecommendations');

    // Timeout de 15 secondes
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Qloo API timeout')), 15000)
    );

    const apiPromise = (async () => {
      // Essayer d'obtenir des recommandations réelles depuis l'API Qloo
      const qloo_url = process.env.QLOO_API_URL || 'https://hackathon.api.qloo.com';
      const qloo_key = process.env.QLOO_API_KEY;

      if (!qloo_key) {
        console.log('No Qloo API key found, using fallback');
        return [];
      }

      // Mapping des intérêts vers des tags ou stratégies de recherche potentiels
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
        'nature': ['park', 'outdoor', 'nature'],
        'chess': ['chess', 'game', 'club'],
        'cheese': ['cheese', 'food', 'gourmet']
      };

      // Construire l'URL de l'API avec le filtrage par localisation et intérêt
      const encodedLocation = encodeURIComponent(location);
      let apiUrl = `${qloo_url}/v2/insights/?filter.type=urn:entity:place&filter.location.query=${encodedLocation}&limit=20`;

      console.log(`🌍 Qloo API: Fetching cultural places for "${location}" + "${interest}"`);
      console.log(`🔗 Qloo API URL: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'X-Api-Key': qloo_key,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('Qloo API error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        return [];
      }

      const data = await response.json();
      console.log(`✅ Qloo API: Retrieved ${data.results?.entities?.length || 0} cultural places with taste intelligence`);
      
      // Debug: Log first few places to see what we're getting
      if (data.results?.entities?.length > 0) {
        console.log('🔍 Sample Qloo places received:');
        data.results.entities.slice(0, 3).forEach((place: any, index: number) => {
          console.log(`  ${index + 1}. ${place.name} - ${place.properties?.address || place.disambiguation || 'No address'}`);
        });
      }

      // Extraire les lieux de la réponse
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
        }));

        // Extraire les parties de la localisation pour validation
        const locationParts = location.split(',').map(part => part.trim().toLowerCase());
        const cityName = locationParts[0];
        const countryName = locationParts.length > 1 ? locationParts[1] : null;

        // Filtrer les lieux pour s'assurer qu'ils correspondent à la localisation demandée
        const locationFilteredPlaces = places.filter((place: any) => {
          // Si pas d'adresse, on ne peut pas valider
          if (!place.address) return true;

          const addressLower = place.address.toLowerCase();

          // Vérifier si l'adresse contient le nom de la ville
          const hasCityInAddress = addressLower.includes(cityName);

          // Vérifier si l'adresse contient le nom du pays (si fourni)
          const hasCountryInAddress = countryName ? addressLower.includes(countryName) : true;

          // Pour les lieux qui ne correspondent pas à la localisation, les logger pour débogage
          if (!(hasCityInAddress || hasCountryInAddress)) {
            console.log(`Filtering out place with mismatched location: ${place.name}, ${place.address} - doesn't match ${location}`);
          }

          // Garder le lieu s'il correspond à la ville ou au pays
          return hasCityInAddress || hasCountryInAddress;
        });

        // Filtrer les lieux en fonction de l'intérêt si nous avons des résultats
        const lowerInterest = interest.toLowerCase();
        const relevantPlaces = locationFilteredPlaces.filter((place: any) => {
          const searchText = `${place.name} ${place.description} ${place.category} ${place.keywords}`.toLowerCase();
          return interestMapping[lowerInterest]?.some(keyword => searchText.includes(keyword)) ||
            searchText.includes(lowerInterest);
        });

        // Utiliser les lieux pertinents s'ils existent, sinon utiliser les lieux filtrés par localisation
        const placesToUse = relevantPlaces.length > 0 ? relevantPlaces : locationFilteredPlaces;

        // Enrichir les lieux avec des images
        const enrichedPlaces = await enrichPlacesWithImages(placesToUse);

        return enrichedPlaces;
      }

      return [];
    })();

    const data = await Promise.race([apiPromise, timeoutPromise]) as any[];

    console.timeEnd('getPlaceRecommendations');

    if (data.length === 0) {
      console.warn(`Qloo returned empty results for location: ${location}, interest: ${interest}`);
    }
    return data;
  } catch (error) {
    console.error('Qloo API error or timeout:', error);
    console.timeEnd('getPlaceRecommendations');
    return []; // Fallback rapide vers vide
  }
}

// Fonction pour enrichir les lieux avec des images
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
  const costs: string[] = [];
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
  return places.map((place: any, index: number) => {
    const estimatedCost = costs[index] || null;
    const priceLevel = estimatedCost ? getPriceLevel(estimatedCost) : undefined;

    return {
      ...place,
      estimatedCost,
      priceLevel
    };
  });
}

// Fonction pour générer des recommandations de lieux avec l'IA
async function generateVenueRecommendationsWithAI(interest: string, location: string, venues: any[], budgetPerDay?: number): Promise<{ textResponse: string, extractedPlaces: any[] }> {
  if (!groq) {
    const fallbackText = `Here are some great places for ${interest} in ${location}:\n\n1. Popular venue in ${location}\n2. Local favorite spot\n3. Highly rated location\n4. Must-visit place\n5. Recommended by locals`;
    return {
      textResponse: fallbackText,
      extractedPlaces: []
    };
  }

  // Si les lieux sont vides (Qloo a échoué), retourner un message de secours au lieu d'halluciner
  if (venues.length === 0) {
    const noVenuesMessage = `I couldn't find specific venue details for ${interest} in ${location} right now. Would you like suggestions for a different location or more details on your preferences?`;
    return {
      textResponse: noVenuesMessage,
      extractedPlaces: []
    };
  }

  // Extraire le pays de la localisation s'il contient une virgule (ex: "Bruges, Belgium")
  const locationParts = location.split(',').map(part => part.trim());
  const city = locationParts[0];
  const country = locationParts.length > 1 ? locationParts[1] : '';

  // Localisation complète avec pays pour plus de clarté
  const fullLocation = country ? `${city}, ${country}` : location;

  // Contexte de budget pour le LLM
  const budgetContext = budgetPerDay
    ? `Budget: €${budgetPerDay}/day. Recommend a smart mix of budget-friendly and mid-range options. Include estimated costs (€) for each place.`
    : 'Include estimated costs (€) for each place when possible.';

  let attempts = 0;
  const maxAttempts = 2;
  let aiResponse = '';

  while (attempts < maxAttempts) {
    try {
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are a local travel expert for ${fullLocation} ONLY. Create a detailed trip plan STRICTLY for ${fullLocation} and the interest in ${interest}. Do NOT mix in other locations or unrelated activities.

            ${venues.length > 0 ? `MUST use these real venues as the basis: ${venues.map(v => `${v.name} (${v.address})`).join(', ')}. Expand with genuine details but stay accurate.` : 'Use your knowledge to recommend real places, but keep it focused.'}
            
            IMPORTANT: Ensure all recommendations are for ${fullLocation} and not for any other location with a similar name in a different country.

            ${budgetContext}

            Use proper markdown formatting:
            - **Bold** for venue names and important highlights
            - Use bullet points (-) for features, tips, and details
            - Clear numbering (1., 2., 3., etc.) for the main venues
            - Line breaks for better readability
            - Include **💰 Cost:** for each venue (e.g., "💰 Cost: €15-25 per person")

            IMPORTANT FORMAT: For each place, include the name followed by the address in parentheses, like this:
            "1. Place Name (Street Address, City, Country)"
            
            This format is critical for proper processing of your recommendations.

            Include:
            1. Top 5 real, specific venues/places in ${fullLocation} for ${interest}
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
      });

      aiResponse = chatCompletion.choices[0]?.message?.content || "";

      // Vérifier si la réponse semble incomplète (se termine brusquement ou n'a pas de fin appropriée)
      if (aiResponse && (aiResponse.match(/[.!?]$/) || aiResponse.length > 800)) {
        break;
      } else {
        console.warn(`AI response may be incomplete on attempt ${attempts + 1}:`, aiResponse);
        attempts++;
        if (attempts >= maxAttempts) {
          aiResponse = aiResponse || `Here are some great places for ${interest} in ${location}:\n\n1. Popular venue in ${location} (Main Street, ${location})\n2. Local favorite spot (Central Square, ${location})\n3. Highly rated location (Tourist Avenue, ${location})\n4. Must-visit place (Cultural District, ${location})\n5. Recommended by locals (Local Street, ${location})`;
          break;
        }
      }
    } catch (error) {
      console.error('Error generating venue recommendations:', error);
      attempts++;
      if (attempts >= maxAttempts) {
        aiResponse = `Here are some great places for ${interest} in ${location}:\n\n1. Popular venue in ${location} (Main Street, ${location})\n2. Local favorite spot (Central Square, ${location})\n3. Highly rated location (Tourist Avenue, ${location})\n4. Must-visit place (Cultural District, ${location})\n5. Recommended by locals (Local Street, ${location})`;
        break;
      }
    }
  }

  // Extraire les lieux mentionnés dans la réponse de l'IA
  const extractedPlaces = extractPlacesFromAIResponse(aiResponse, location);

  // Géocoder les lieux extraits
  let geocodedPlaces = [];
  if (extractedPlaces.length > 0) {
    try {
      geocodedPlaces = await geocodePlaces(extractedPlaces, location);
      console.log(`Extracted and geocoded ${geocodedPlaces.length} places from AI response`);
    } catch (error) {
      console.error('Error geocoding places:', error);
    }
  }

  // Combiner les lieux de l'API Qloo avec les lieux extraits de l'IA
  // Privilégier les lieux extraits de l'IA s'ils existent
  const combinedPlaces = geocodedPlaces.length > 0 ? geocodedPlaces : venues;

  return {
    textResponse: aiResponse,
    extractedPlaces: combinedPlaces
  };
}

// Fonction principale pour obtenir des recommandations
async function getRecommendations(location: string, interest: string, budgetPerDay?: number): Promise<{ message: string, places: any[] }> {
  try {
    console.time('getRecommendations');

    // 1. Obtenir des lieux depuis l'API Qloo
    const qlooPlaces = await getPlaceRecommendations(location, interest);
    console.log(`🏛️  Qloo Intelligence: Found ${qlooPlaces.length} culturally relevant places`);

    // 2. Vérifier si les résultats de Qloo sont utilisables
    const locationParts = location.split(',').map(part => part.trim().toLowerCase());
    const cityName = locationParts[0];
    const countryName = locationParts.length > 1 ? locationParts[1] : null;

    // Filtrer les lieux pour s'assurer qu'ils correspondent à la localisation demandée
    const validQlooPlaces = qlooPlaces.filter(place => {
      if (!place.address) return false;
      const addressLower = place.address.toLowerCase();
      const hasCityInAddress = addressLower.includes(cityName);
      const hasCountryInAddress = countryName ? addressLower.includes(countryName) : true;

      return hasCityInAddress || hasCountryInAddress;
    });

    console.log(`${validQlooPlaces.length} places match the requested location`);

    // 3. Décider quelle source utiliser
    let placesToUse = [];
    let textResponse = "";

    if (validQlooPlaces.length >= 3) {
      // Si Qloo a fourni au moins 3 lieux valides, les utiliser
      console.log(`🎯 Smart Filtering: Using ${validQlooPlaces.length} location-validated Qloo places`);

      // Générer une description textuelle avec le LLM en utilisant ces lieux
      const venueRecommendations = await generateVenueRecommendationsWithAI(interest, location, validQlooPlaces, budgetPerDay);
      textResponse = venueRecommendations.textResponse;

      // Extraire les lieux du texte généré par le LLM
      const extractedPlaces = extractPlacesFromAIResponse(textResponse, location);
      console.log(`Extracted ${extractedPlaces.length} places from LLM response`);

      if (extractedPlaces.length > 0) {
        // Si des lieux ont été extraits du texte, les géocoder
        const geocodedPlaces = await geocodePlaces(extractedPlaces, location);
        placesToUse = geocodedPlaces;
        console.log(`Using ${placesToUse.length} places extracted from LLM response`);
      } else {
        // Sinon, utiliser les lieux Qloo valides
        placesToUse = validQlooPlaces;
        console.log(`Using ${placesToUse.length} valid places from Qloo API (no extraction)`);
      }
    } else {
      // Si Qloo n'a pas fourni assez de lieux valides, utiliser le LLM pour générer des lieux
      console.log(`Insufficient Qloo results (${validQlooPlaces.length}), using LLM to generate places`);
      const venueRecommendations = await generateVenueRecommendationsWithAI(interest, location, qlooPlaces, budgetPerDay);
      textResponse = venueRecommendations.textResponse;

      // Extraire les lieux du texte généré par le LLM
      const extractedPlaces = extractPlacesFromAIResponse(textResponse, location);
      console.log(`Extracted ${extractedPlaces.length} places from LLM response`);

      if (extractedPlaces.length > 0) {
        // Si des lieux ont été extraits du texte, les géocoder
        const geocodedPlaces = await geocodePlaces(extractedPlaces, location);
        placesToUse = geocodedPlaces;
        console.log(`Using ${placesToUse.length} places extracted from LLM response`);
      } else {
        // Si l'extraction échoue, revenir aux lieux Qloo (même s'ils sont peu nombreux)
        placesToUse = validQlooPlaces.length > 0 ? validQlooPlaces : qlooPlaces;
        console.log(`Extraction failed, falling back to ${placesToUse.length} Qloo places`);
      }
    }

    // Enrichir les lieux avec des informations de prix
    const enrichedPlaces = enrichPlacesWithPricing(placesToUse, textResponse);

    console.timeEnd('getRecommendations');

    return {
      message: textResponse,
      places: enrichedPlaces
    };
  } catch (error) {
    console.error('Error in getRecommendations:', error);
    console.timeEnd('getRecommendations');

    // En cas d'erreur, retourner une réponse par défaut
    return {
      message: `Here are some great places for ${interest} in ${location}:\n\n1. Popular venue in ${location}\n2. Local favorite spot\n3. Highly rated location\n4. Must-visit place\n5. Recommended by locals`,
      places: []
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 AI Travel Assistant: Processing new chat request');
    const { messages, chatState, tripDetails } = await request.json();

    // Variables pour stocker la réponse et l'état de la conversation
    let responseMessage = "";
    let newState = chatState ? { ...chatState } : {
      stage: 'initial',
      userPreferences: [],
      selectedLocation: null,
      suggestedLocations: []
    };
    let placesData: any[] = [];

    // Traiter la conversation selon l'état actuel
    if (!chatState || chatState.stage === 'initial') {
      // Étape initiale : accueillir l'utilisateur et demander ses intérêts
      responseMessage = "What do you like?";
      newState.stage = 'preference_gathering';
    }
    else if (chatState.stage === 'preference_gathering') {
      // Étape de collecte des préférences : l'utilisateur a indiqué ce qu'il aime
      const lastMessage = messages[messages.length - 1];
      const interest = lastMessage.content;
      newState.userPreferences = [interest];

      // Générer des suggestions de localisation basées sur l'intérêt
      const suggestions = await generateLocationSuggestions(interest);
      newState.suggestedLocations = suggestions.locations;
      newState.stage = 'location_selection';
      responseMessage = suggestions.response;
    }
    else if (chatState.stage === 'location_selection') {
      // Étape de sélection de la localisation : l'utilisateur a choisi une destination
      const lastMessage = messages[messages.length - 1];
      const interest = chatState.userPreferences[0] || "";

      // Afficher les suggestions disponibles pour le débogage
      console.log(`Available location suggestions: ${JSON.stringify(chatState.suggestedLocations)}`);
      console.log(`User message: "${lastMessage.content}"`);

      // D'abord essayer d'extraire la localisation des suggestions
      let extractedLoc = extractLocation(lastMessage.content, chatState.suggestedLocations);

      // Si pas trouvé dans les suggestions, vérifier si l'utilisateur a tapé une destination valide
      if (!extractedLoc) {
        const userInput = lastMessage.content.trim();

        // Vérifier si l'input ressemble à une destination (contient une virgule ou des mots capitalisés)
        const looksLikeLocation = /^[A-Z][a-zA-Z\s]+(?:,\s*[A-Z][a-zA-Z\s]+)?$/.test(userInput) ||
          userInput.includes(',') ||
          /^[A-Z][a-zA-Z\s]{2,}$/.test(userInput);

        if (looksLikeLocation) {
          // L'utilisateur a probablement tapé sa propre destination
          extractedLoc = userInput;
          console.log(`User provided custom location: "${extractedLoc}"`);
        }
      }

      if (extractedLoc) {
        // Localisation extraite avec succès : passer aux recommandations
        console.log(`🎯 Location Intelligence: Successfully parsed "${extractedLoc}" from user input`);

        // Confirmer explicitement la localisation choisie
        newState.selectedLocation = extractedLoc;
        newState.stage = 'recommendations';

        // Calculer le budget quotidien à partir des détails du voyage
        let budgetPerDay: number | undefined;

        if (tripDetails?.budget && tripDetails?.startDate && tripDetails?.endDate) {
          const startDate = new Date(tripDetails.startDate);
          const endDate = new Date(tripDetails.endDate);
          const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          budgetPerDay = Math.round(tripDetails.budget / diffDays);
        }

        // Obtenir des recommandations en utilisant à la fois Qloo et le LLM
        console.log(`🧠 AI + Qloo Fusion: Generating personalized recommendations for "${extractedLoc}" + "${interest}"`);
        const recommendations = await getRecommendations(extractedLoc, interest, budgetPerDay);

        // Ajouter une confirmation explicite de la destination choisie au début de la réponse
        responseMessage = `Welcome to ${extractedLoc}!\n\n${recommendations.message}`;
        placesData = recommendations.places;
      } else {
        // Pas de localisation extraite : demander à l'utilisateur de choisir parmi les suggestions ou de spécifier sa destination
        console.log(`Failed to extract location from "${lastMessage.content}"`);

        // Améliorer le message d'erreur pour être plus clair et permettre des destinations personnalisées
        const suggestionsFormatted = chatState.suggestedLocations.map((loc: string) => `"${loc}"`).join(', ');
        responseMessage = `I'm not sure which location you're interested in. You can either:\n\n1. Choose one of these suggested locations: ${suggestionsFormatted}\n2. Or tell me any other city/destination you'd like to visit (e.g., "Hamburg, Germany" or "Tokyo, Japan")`;
      }
    }
    else if (chatState.stage === 'recommendations') {
      // Étape des recommandations : l'utilisateur a déjà reçu des recommandations
      const lastMessage = messages[messages.length - 1];
      const interest = chatState.userPreferences[0] || "";
      const location = chatState.selectedLocation || "";

      // Générer une réponse basée sur le message de l'utilisateur
      responseMessage = await generateAIResponse(
        lastMessage.content,
        interest,
        location
      );
    }
    else {
      // État inconnu : réinitialiser la conversation
      responseMessage = "What do you like?";
      newState = {
        stage: 'preference_gathering',
        userPreferences: [],
        selectedLocation: null,
        suggestedLocations: []
      };
    }

    // Renvoyer la réponse
    return NextResponse.json({
      message: responseMessage,
      chatState: newState,
      places: placesData
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message', message: "I'm sorry, I encountered an error. Please try again." },
      { status: 500 }
    );
  }
}