import { PlaceImage } from '@/types/place';

// Fonction pour récupérer des images depuis Unsplash
export async function getUnsplashImages(placeName: string, location: string, category?: string): Promise<PlaceImage[]> {
  try {
    // Construire les termes de recherche
    const searchTerms = [placeName];
    if (location) searchTerms.push(location);
    if (category) {
      const categoryTerms: Record<string, string> = {
        'restaurant': 'food restaurant',
        'cafe': 'coffee cafe',
        'museum': 'museum art',
        'park': 'park nature',
        'hotel': 'hotel accommodation',
        'bar': 'bar nightlife',
        'shop': 'shopping store',
        'attraction': 'tourist attraction'
      };
      
      if (categoryTerms[category.toLowerCase()]) {
        searchTerms.push(categoryTerms[category.toLowerCase()]);
      } else {
        searchTerms.push(category);
      }
    }
    
    const query = encodeURIComponent(searchTerms.join(' '));
    
    // Vérifier si la clé API est disponible
    const accessKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
      console.warn('Clé API Unsplash non disponible, utilisation des images de secours');
      return getFallbackImages(category);
    }
    
    const response = await fetch(`https://api.unsplash.com/search/photos?query=${query}&per_page=3`, {
      headers: {
        'Authorization': `Client-ID ${accessKey}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des images Unsplash');
    }
    
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      return data.results.map((img: any) => ({
        id: img.id,
        url: img.urls.small,
        alt: `${placeName} in ${location}`,
        credit: img.user.name,
        creditUrl: img.user.links.html
      }));
    }
    
    // Si aucune image n'est trouvée, utiliser les images de secours
    return getFallbackImages(category);
  } catch (error) {
    console.error('🖼️  Unsplash API error, using fallback images:', error);
    return getFallbackImages(category);
  }
}

// Fonction pour obtenir des images de secours basées sur la catégorie
export function getFallbackImages(category?: string): PlaceImage[] {
  const fallbackMap: Record<string, PlaceImage[]> = {
    'restaurant': [
      {
        id: 'rest1',
        url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
        alt: 'Restaurant interior',
        credit: 'Unsplash'
      }
    ],
    'cafe': [
      {
        id: 'cafe1',
        url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb',
        alt: 'Café',
        credit: 'Unsplash'
      }
    ],
    'museum': [
      {
        id: 'museum1',
        url: 'https://images.unsplash.com/photo-1565060169187-5284a3f427a7',
        alt: 'Museum',
        credit: 'Unsplash'
      }
    ],
    'park': [
      {
        id: 'park1',
        url: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f',
        alt: 'Park',
        credit: 'Unsplash'
      }
    ],
    'default': [
      {
        id: 'default1',
        url: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd',
        alt: 'Travel destination',
        credit: 'Unsplash'
      }
    ]
  };
  
  return category && fallbackMap[category.toLowerCase()] 
    ? fallbackMap[category.toLowerCase()] 
    : fallbackMap['default'];
}