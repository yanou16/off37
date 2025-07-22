import React, { useEffect, useState } from 'react';
import { Loader } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

interface Place {
  name: string;
  address: string;
  rating?: number;
  description?: string;
  coordinates?: [number, number]; // [latitude, longitude]
}

interface MapComponentProps {
  location: string;
  places: Place[];
}

// Composant pour centrer la carte sur une position
const SetViewOnLocation = ({ coords }: { coords: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(coords, 13);
  }, [coords, map]);
  return null;
};

const MapComponent: React.FC<MapComponentProps> = ({ location, places }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationCoords, setLocationCoords] = useState<[number, number]>([51.505, -0.09]); // Default: London
  const [placesWithCoords, setPlacesWithCoords] = useState<Place[]>([]);
  
  // Correction pour les icônes Leaflet dans Next.js
  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    });
  }, []);
  
  useEffect(() => {
    const geocodeAddress = async (address: string) => {
      try {
        // Check if this is a synthetic place by looking for specific patterns in the address
        const isSyntheticPlace = address.includes('Piazza Centrale') || 
                                address.includes('Via Mercato') || 
                                address.includes('Via Roma 42') || 
                                address.includes('Corso Italia 15') || 
                                address.includes('Piazza Cultura 1');
        
        // Extract the main location from the address (the part after the last comma)
        const addressParts = address.split(',');
        const mainLocation = addressParts.length > 1 ? 
          addressParts.slice(-2).join(',').trim() : 
          address;
        
        // For synthetic places, geocode only the main location (city, country)
        if (isSyntheticPlace) {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mainLocation)}`);
          const data = await response.json();
          
          if (data && data.length > 0) {
            return {
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon),
              display_name: data[0].display_name
            };
          }
          return null;
        }
        
        // For regular addresses, use more sophisticated geocoding
        // Check if the address contains country information
        const hasCountry = address.includes(',');
        
        // If address contains country info, use it directly; otherwise, add more specific parameters
        let apiUrl = `https://nominatim.openstreetmap.org/search?format=json`;
        
        if (hasCountry) {
          // For addresses with country info, use the full address
          // But check if it's a case where a New York address has a different city appended
          if (address.toLowerCase().includes('new york') && 
              (address.toLowerCase().includes('parma, italy') || 
               address.toLowerCase().includes('bruges, belgium') ||
               address.toLowerCase().includes('turin, italy'))) {
            // This is likely a mismatched address - geocode only the main location
            apiUrl += `&q=${encodeURIComponent(mainLocation)}`;
          } else {
            apiUrl += `&q=${encodeURIComponent(address)}`;
          }
        } else {
          // For city names without country, try to be more specific
          // Extract the first part of the location (city name)
          const cityName = address.split(',')[0].trim();
          
          // Handle special cases for cities
          if (cityName.toLowerCase() === 'bruges') {
            apiUrl += `&city=${encodeURIComponent('Bruges')}&country=${encodeURIComponent('Belgium')}`;
          } else if (cityName.toLowerCase() === 'parma') {
            apiUrl += `&city=${encodeURIComponent('Parma')}&country=${encodeURIComponent('Italy')}`;
          } else if (cityName.toLowerCase() === 'turin') {
            apiUrl += `&city=${encodeURIComponent('Turin')}&country=${encodeURIComponent('Italy')}`;
          } else {
            apiUrl += `&q=${encodeURIComponent(address)}`;
          }
        }
        
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (data && data.length > 0) {
          return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            display_name: data[0].display_name
          };
        }
        return null;
      } catch (error) {
        console.error("🗺️  Map geocoding error:", error);
        return null;
      }
    };
    
    const loadPlacesData = async () => {
      try {
        setIsLoading(true);
        
        // Géocoder la location principale
        const locationData = await geocodeAddress(location);
        
        if (locationData) {
          setLocationCoords([locationData.lat, locationData.lng]);
          
          // Géocoder chaque lieu
          const updatedPlaces: Place[] = [];
          
          for (let i = 0; i < places.length; i++) {
            const place = places[i];
            if (place.address) {
              const addressToGeocode = place.address.includes(location) 
                ? place.address 
                : `${place.address}, ${location}`;
              
              // Ajouter un délai pour éviter de surcharger l'API Nominatim
              if (i > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
              
              const placeData = await geocodeAddress(addressToGeocode);
              
              if (placeData) {
                updatedPlaces.push({
                  ...place,
                  coordinates: [placeData.lat, placeData.lng]
                });
              } else {
                updatedPlaces.push(place);
              }
            } else {
              updatedPlaces.push(place);
            }
          }
          
          setPlacesWithCoords(updatedPlaces);
        } else {
          setError(`Impossible de localiser "${location}" sur la carte.`);
        }
      } catch (err) {
        console.error("Erreur lors du chargement des données:", err);
        setError("Une erreur s'est produite lors du chargement des données de la carte.");
      } finally {
        setIsLoading(false);
      }
    };
    
    if (places.length > 0) {
      loadPlacesData();
    } else {
      setIsLoading(false);
    }
  }, [location, places]);
  
  // Créer une icône personnalisée avec un numéro
  const createNumberIcon = (number: number) => {
    return L.divIcon({
      className: 'custom-number-icon',
      html: `<div style="background-color: #333; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white;">${number}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-zinc-900">
        <Loader className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-zinc-900 text-red-400 p-4 text-center">
        <p>{error}</p>
      </div>
    );
  }
  
  return (
    <div style={{ height: '400px', width: '100%' }}>
      <MapContainer 
        center={locationCoords} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <SetViewOnLocation coords={locationCoords} />
        
        {/* Marqueur pour la location principale */}
        <Marker position={locationCoords}>
          <Popup>
            <b>{location}</b>
          </Popup>
        </Marker>
        
        {/* Marqueurs pour les lieux */}
        {placesWithCoords.map((place, index) => (
          place.coordinates && (
            <Marker 
              key={index} 
              position={place.coordinates} 
              icon={createNumberIcon(index + 1)}
            >
              <Popup>
                <div style={{ maxWidth: '200px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px' }}>{place.name}</h3>
                  <p style={{ margin: '5px 0', fontSize: '14px' }}>{place.address}</p>
                  {place.rating && <p style={{ margin: 0, fontSize: '14px' }}>Note: {place.rating}/5</p>}
                  {place.description && (
                    <p style={{ margin: '5px 0', fontSize: '12px' }}>
                      {place.description.substring(0, 100)}
                      {place.description.length > 100 ? '...' : ''}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        ))}
      </MapContainer>
    </div>
  );
};

export default MapComponent;