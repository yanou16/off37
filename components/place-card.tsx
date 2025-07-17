import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Star, MapPin, ExternalLink, Loader } from 'lucide-react';
import { Button } from './ui/button';
import { PlaceImage } from '@/types/place';
import { getUnsplashImages, getFallbackImages } from '@/lib/image-service';

interface PlaceCardProps {
  place: {
    name: string;
    address: string;
    rating?: number;
    description?: string;
    category?: string;
    images?: PlaceImage[];
  };
  index: number;
}

const PlaceCard: React.FC<PlaceCardProps> = ({ place, index }) => {
  const [images, setImages] = useState<PlaceImage[]>(place.images || []);
  const [loading, setLoading] = useState(!place.images);
  
  useEffect(() => {
    // Si le lieu n'a pas d'images, en récupérer depuis Unsplash
    const fetchImages = async () => {
      if (!place.images || place.images.length === 0) {
        try {
          setLoading(true);
          const fetchedImages = await getUnsplashImages(
            place.name, 
            place.address, 
            place.category
          );
          setImages(fetchedImages);
        } catch (error) {
          console.error('Erreur lors du chargement des images:', error);
          setImages(getFallbackImages(place.category));
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchImages();
  }, [place]);
  
  // Prendre la première image comme image principale
  const mainImage = images && images.length > 0 ? images[0] : null;
  
  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900">
      <div className="relative aspect-video">
        {loading ? (
          <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
            <Loader className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : mainImage ? (
          <Image
            src={mainImage.url}
            alt={mainImage.alt || place.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
            <span className="text-zinc-500">Aucune image</span>
          </div>
        )}
        <div className="absolute top-2 left-2 bg-black bg-opacity-70 rounded-full w-8 h-8 flex items-center justify-center text-white font-bold">
          {index + 1}
        </div>
        {place.rating && (
          <div className="absolute top-2 right-2 bg-black bg-opacity-70 rounded-md px-2 py-1 flex items-center">
            <Star className="h-3 w-3 text-yellow-400 mr-1" />
            <span className="text-white text-xs font-medium">{place.rating}</span>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-semibold text-white mb-1">{place.name}</h3>
        
        <div className="flex items-start mb-2">
          <MapPin className="h-4 w-4 text-zinc-400 mt-0.5 mr-1 flex-shrink-0" />
          <p className="text-sm text-zinc-400">{place.address}</p>
        </div>
        
        {place.description && (
          <p className="text-sm text-zinc-300 mb-3">
            {place.description.length > 100 
              ? `${place.description.substring(0, 100)}...` 
              : place.description}
          </p>
        )}
        
        {/* Miniatures des images supplémentaires */}
        {!loading && images && images.length > 1 && (
          <div className="flex gap-2 mb-3">
            {images.slice(1, 4).map((image) => (
              <div key={image.id} className="relative w-16 h-16 rounded-md overflow-hidden">
                <Image
                  src={image.url}
                  alt={image.alt || ''}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <div className="text-xs text-zinc-500">
            {place.category && (
              <span className="bg-zinc-800 px-2 py-1 rounded-md">{place.category}</span>
            )}
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs"
            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' ' + place.address)}`, '_blank')}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Voir sur la carte
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PlaceCard;