import React, { useEffect, useState } from 'react';
import { Loader, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { PlaceImage } from '@/types/place';
import { getUnsplashImages, getFallbackImages } from '@/lib/image-service';

interface PlaceImagesProps {
  placeName: string;
  location: string;
  category?: string;
}

const PlaceImages: React.FC<PlaceImagesProps> = ({ placeName, location, category }) => {
  const [images, setImages] = useState<PlaceImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImages = async () => {
      if (!placeName) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Récupérer les images depuis Unsplash
        const fetchedImages = await getUnsplashImages(placeName, location, category);
        setImages(fetchedImages);
      } catch (err) {
        console.error('Erreur lors du chargement des images:', err);
        setError('Impossible de charger les images');
        // Utiliser des images de secours en cas d'erreur
        setImages(getFallbackImages(category));
      } finally {
        setLoading(false);
      }
    };
    
    fetchImages();
  }, [placeName, location, category]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 bg-zinc-900 rounded-lg">
        <Loader className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }
  
  if (error || images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 bg-zinc-900 rounded-lg">
        <ImageIcon className="h-10 w-10 text-zinc-700 mb-2" />
        <p className="text-zinc-500 text-sm">Aucune image disponible</p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {images.map((image) => (
        <div key={image.id} className="relative aspect-square rounded-md overflow-hidden">
          <Image
            src={image.url}
            alt={image.alt}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-1">
            <p className="text-xs text-white text-center">
              {image.creditUrl ? (
                <a href={image.creditUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {image.credit}
                </a>
              ) : (
                image.credit
              )}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PlaceImages;