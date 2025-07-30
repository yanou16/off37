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
    return getFallbackImages(category, placeName);
  } catch (error) {
    console.error('🖼️  Unsplash API error, using fallback images:', error);
    return getFallbackImages(category, placeName);
  }
}

// Fonction pour obtenir des images de secours basées sur la catégorie
export function getFallbackImages(category?: string, placeName?: string): PlaceImage[] {
  // Images variées pour différents types de lieux
  const fallbackMap: Record<string, PlaceImage[]> = {
    'restaurant': [
      {
        id: 'rest1',
        url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
        alt: 'Restaurant interior',
        credit: 'Unsplash'
      },
      {
        id: 'rest2', 
        url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400',
        alt: 'Restaurant food',
        credit: 'Unsplash'
      },
      {
        id: 'rest3',
        url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400',
        alt: 'Restaurant dining',
        credit: 'Unsplash'
      }
    ],
    'cafe': [
      {
        id: 'cafe1',
        url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400',
        alt: 'Café interior',
        credit: 'Unsplash'
      },
      {
        id: 'cafe2',
        url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400',
        alt: 'Coffee shop',
        credit: 'Unsplash'
      }
    ],
    'museum': [
      {
        id: 'museum1',
        url: 'https://images.unsplash.com/photo-1565060169187-5284a3f427a7?w=400',
        alt: 'Museum interior',
        credit: 'Unsplash'
      },
      {
        id: 'museum2',
        url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400',
        alt: 'Art museum',
        credit: 'Unsplash'
      }
    ],
    'park': [
      {
        id: 'park1',
        url: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=400',
        alt: 'Beautiful park',
        credit: 'Unsplash'
      },
      {
        id: 'park2',
        url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
        alt: 'Park landscape',
        credit: 'Unsplash'
      }
    ],
    'attraction': [
      {
        id: 'attr1',
        url: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73f6e?w=400',
        alt: 'Tourist attraction',
        credit: 'Unsplash'
      },
      {
        id: 'attr2',
        url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400',
        alt: 'Historic site',
        credit: 'Unsplash'
      }
    ],
    'shop': [
      {
        id: 'shop1',
        url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400',
        alt: 'Shop interior',
        credit: 'Unsplash'
      }
    ],
    'default': [
      {
        id: 'default1',
        url: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400',
        alt: 'Travel destination',
        credit: 'Unsplash'
      },
      {
        id: 'default2',
        url: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400',
        alt: 'City view',
        credit: 'Unsplash'
      },
      {
        id: 'default3',
        url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
        alt: 'Travel scene',
        credit: 'Unsplash'
      }
    ]
  };
  
  // Sélectionner une image aléatoire basée sur le nom du lieu pour éviter les doublons
  const categoryImages = category && fallbackMap[category.toLowerCase()] 
    ? fallbackMap[category.toLowerCase()] 
    : fallbackMap['default'];
    
  // Utiliser le nom du lieu pour créer un index "pseudo-aléatoire" mais consistant
  const hash = placeName ? placeName.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0) : 0;
  
  const selectedIndex = Math.abs(hash) % categoryImages.length;
  return [categoryImages[selectedIndex]];
}