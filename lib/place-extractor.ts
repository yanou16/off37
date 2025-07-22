// Import supprimé car non utilisé

interface ExtractedPlace {
    name: string;
    address: string;
    description?: string;
    rating?: number;
    cost?: string;
    priceLevel?: 'budget' | 'mid' | 'high';
    category?: string;
    id?: string;
    isAIGenerated?: boolean;
}

/**
 * Extrait les lieux mentionnés dans la réponse de l'IA
 * @param aiResponse Réponse textuelle de l'IA
 * @param location Localisation principale (ville, pays)
 * @returns Liste des lieux extraits
 */
export function extractPlacesFromAIResponse(aiResponse: string, location: string): ExtractedPlace[] {
    const extractedPlaces: ExtractedPlace[] = [];

    // Regex pour trouver les lieux numérotés avec leur nom et adresse
    // Format typique: "1. Nom du lieu (Adresse)"
    const placeRegex = /(\d+)\.\s+([^(]+)\s*\(([^)]+)\)/g;
    let match;

    while ((match = placeRegex.exec(aiResponse)) !== null) {
        const placeNumber = parseInt(match[1]);
        const placeName = match[2].trim();
        const placeAddress = match[3].trim();

        // Chercher la description qui suit (jusqu'au prochain numéro ou jusqu'à "💰 Cost:")
        const startIndex = match.index + match[0].length;
        const nextPlaceIndex = aiResponse.indexOf(`${placeNumber + 1}.`, startIndex);
        const costIndex = aiResponse.indexOf("💰 Cost:", startIndex);

        let endIndex = nextPlaceIndex > -1 ? nextPlaceIndex : aiResponse.length;
        if (costIndex > -1 && costIndex < endIndex) {
            endIndex = costIndex;
        }

        let description = aiResponse.substring(startIndex, endIndex).trim();

        // Extraire le coût si présent
        const costRegex = /💰\s*Cost:\s*(€[\d\-€\s,]+)/i;
        const costMatch = aiResponse.substring(startIndex).match(costRegex);
        const cost = costMatch ? costMatch[1].trim() : undefined;

        // Déterminer la catégorie basée sur des mots-clés dans le nom ou la description
        let category = 'attraction';
        if (/museum|gallery|exhibition/i.test(placeName + ' ' + description)) {
            category = 'museum';
        } else if (/restaurant|dining|food|eat/i.test(placeName + ' ' + description)) {
            category = 'restaurant';
        } else if (/cafe|coffee|tea/i.test(placeName + ' ' + description)) {
            category = 'cafe';
        } else if (/park|garden|nature/i.test(placeName + ' ' + description)) {
            category = 'park';
        } else if (/shop|store|market/i.test(placeName + ' ' + description)) {
            category = 'shop';
        } else if (/chess/i.test(placeName + ' ' + description)) {
            category = 'chess';
        }

        // Déterminer le niveau de prix basé sur le coût
        let priceLevel: 'budget' | 'mid' | 'high' | undefined;
        if (cost) {
            const numbers = cost.match(/\d+/g);
            if (numbers) {
                const avgPrice = numbers.reduce((sum, num) => sum + parseInt(num), 0) / numbers.length;
                if (avgPrice <= 20) priceLevel = 'budget';
                else if (avgPrice <= 50) priceLevel = 'mid';
                else priceLevel = 'high';
            }
        }

        // Générer un ID unique
        const id = `ai-place-${placeNumber}-${placeName.toLowerCase().replace(/\s+/g, '-')}`;

        // S'assurer que l'adresse contient la localisation
        let fullAddress = placeAddress;
        if (!fullAddress.toLowerCase().includes(location.toLowerCase())) {
            fullAddress = `${fullAddress}, ${location}`;
        }

        extractedPlaces.push({
            name: placeName,
            address: fullAddress,
            description,
            cost,
            priceLevel,
            category,
            id,
            isAIGenerated: true,
            rating: 4.0 + (Math.random() * 0.9) // Générer une note aléatoire entre 4.0 et 4.9
        });
    }

    return extractedPlaces;
}

/**
 * Fonction pour géocoder les lieux extraits
 * @param places Liste des lieux à géocoder
 * @param defaultLocation Localisation par défaut si le géocodage échoue
 * @returns Liste des lieux avec coordonnées
 */
export async function geocodePlaces(places: ExtractedPlace[], defaultLocation: string): Promise<any[]> {
    const geocodedPlaces = [];

    for (const place of places) {
        try {
            // Tenter de géocoder l'adresse
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place.address)}`);
            const data = await response.json();

            if (data && data.length > 0) {
                // Ajouter les coordonnées au lieu
                geocodedPlaces.push({
                    ...place,
                    coordinates: [parseFloat(data[0].lat), parseFloat(data[0].lon)]
                });
            } else {
                // Si le géocodage échoue, utiliser la localisation par défaut
                console.log(`🗺️  Geocoding: ${place.name} - Using fallback coordinates for ${defaultLocation}`);

                // Géocoder la localisation par défaut
                const defaultResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(defaultLocation)}`);
                const defaultData = await defaultResponse.json();

                if (defaultData && defaultData.length > 0) {
                    // Ajouter une légère variation aux coordonnées pour éviter que tous les lieux se superposent
                    const baseLat = parseFloat(defaultData[0].lat);
                    const baseLon = parseFloat(defaultData[0].lon);
                    const latOffset = (Math.random() - 0.5) * 0.01; // Variation de ±0.005 degrés
                    const lonOffset = (Math.random() - 0.5) * 0.01;

                    geocodedPlaces.push({
                        ...place,
                        coordinates: [baseLat + latOffset, baseLon + lonOffset]
                    });
                } else {
                    // Si même la localisation par défaut échoue, ajouter le lieu sans coordonnées
                    geocodedPlaces.push(place);
                }
            }
        } catch (error) {
            console.error(`🗺️  Geocoding error for ${place.name}:`, error);
            geocodedPlaces.push(place);
        }

        // Ajouter un délai pour éviter de surcharger l'API Nominatim
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return geocodedPlaces;
}