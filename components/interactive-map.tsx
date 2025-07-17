"use client";

import React, { useEffect, useState } from 'react';
import { Loader } from 'lucide-react';
import dynamic from 'next/dynamic';

interface Place {
  name: string;
  address: string;
  rating?: number;
  description?: string;
}

interface InteractiveMapProps {
  location: string;
  places: Place[];
}

// Chargement dynamique de la carte pour éviter les problèmes de SSR
const MapComponent = dynamic(() => import('./map-component'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[400px] bg-zinc-900">
      <Loader className="h-8 w-8 animate-spin text-zinc-400" />
    </div>
  )
});

const InteractiveMap: React.FC<InteractiveMapProps> = ({ location, places }) => {
  return (
    <div className="w-full rounded-lg overflow-hidden border border-zinc-800">
      <MapComponent location={location} places={places} />
      
      <div className="p-3 bg-zinc-900 border-t border-zinc-800">
        <p className="text-xs text-zinc-400">
          {places.length} lieux affichés sur la carte. Cliquez sur les marqueurs pour plus de détails.
        </p>
      </div>
    </div>
  );
};

export default InteractiveMap;