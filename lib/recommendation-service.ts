import { extractPlacesFromAIResponse, geocodePlaces } from './place-extractor';
import { getUnsplashImages } from './image-service';

// Interface pour les résultats de recommandation
export interface RecommendationResult {
  textResponse: string;
  places: any[];
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

// Fonction principale pour obtenir des recommandations
// Interface pour les résultats de generateVenueRecommendationsWithAI
interface VenueRecommendationsResult {
  textResponse: string;
  extractedPlaces: any[];
}

export async function getRecommendations(
  location: string, 
  interest: string, 
  getPlaceRecommendations: (location: string, interest: string) => Promise<any[]>,
  generateVenueRecommendationsWithAI: (interest: string, location: string, venues: any[], budgetPerDay?: number) => Promise<VenueRecommendationsResult>,
  interestMapping: { [key: string]: string[] },
  budgetPerDay?: number
): Promise<RecommendationResult> {
  console.time('getRecommendations');
  
  try {
    // 1. Obtenir des lieux depuis l'API Qloo
    const qlooPlaces = await getPlaceRecommendations(location, interest);
    console.log(`Qloo API returned ${qlooPlaces.length} places`);
    
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
    
    // Vérifier si les lieux sont pertinents pour l'intérêt de l'utilisateur
    const lowerInterest = interest.toLowerCase();
    const relevantQlooPlaces = validQlooPlaces.filter(place => {
      const searchText = `${place.name} ${place.description || ''} ${place.category || ''} ${place.keywords || ''}`.toLowerCase();
      return searchText.includes(lowerInterest) || 
             (interestMapping[lowerInterest]?.some(keyword => searchText.includes(keyword)));
    });
    
    console.log(`${relevantQlooPlaces.length} places are relevant to the user's interest`);
    
    // 3. Décider quelle source utiliser
    let placesToUse = [];
    let textResponse = "";
    
    if (relevantQlooPlaces.length >= 3) {
      // Si Qloo a fourni au moins 3 lieux pertinents, les utiliser
      console.log(`Using ${relevantQlooPlaces.length} relevant places from Qloo API`);
      placesToUse = relevantQlooPlaces;
      
      // Générer une description textuelle avec le LLM en utilisant ces lieux
      const venueRecommendations = await generateVenueRecommendationsWithAI(interest, location, placesToUse, budgetPerDay);
      textResponse = venueRecommendations.textResponse;
    } else {
      // Sinon, utiliser le LLM pour générer des lieux
      console.log(`Insufficient Qloo results (${relevantQlooPlaces.length}), using LLM to generate places`);
      const venueRecommendations = await generateVenueRecommendationsWithAI(interest, location, qlooPlaces, budgetPerDay);
      textResponse = venueRecommendations.textResponse;
      
      // Extraire les lieux du texte généré par le LLM
      const extractedPlaces = extractPlacesFromAIResponse(textResponse, location);
      console.log(`Extracted ${extractedPlaces.length} places from LLM response`);
      
      if (extractedPlaces.length > 0) {
        const geocodedPlaces = await geocodePlaces(extractedPlaces, location);
        placesToUse = geocodedPlaces;
        console.log(`Using ${placesToUse.length} places extracted from LLM response`);
      } else {
        // Si l'extraction échoue, revenir aux lieux Qloo valides
        placesToUse = validQlooPlaces.length > 0 ? validQlooPlaces : qlooPlaces;
        console.log(`Extraction failed, falling back to ${placesToUse.length} Qloo places`);
      }
    }
    
    // Enrichir les lieux avec des images et des informations de prix
    console.log('Enriching places with images and pricing information');
    const placesWithImages = await enrichPlacesWithImages(placesToUse);
    const enrichedPlaces = enrichPlacesWithPricing(placesWithImages, textResponse);
    
    console.timeEnd('getRecommendations');
    
    return {
      textResponse,
      places: enrichedPlaces
    };
  } catch (error) {
    console.error('Error in getRecommendations:', error);
    console.timeEnd('getRecommendations');
    
    // En cas d'erreur, retourner une réponse par défaut
    return {
      textResponse: `Here are some great places for ${interest} in ${location}:\n\n1. Popular venue in ${location}\n2. Local favorite spot\n3. Highly rated location\n4. Must-visit place\n5. Recommended by locals`,
      places: []
    };
  }
}