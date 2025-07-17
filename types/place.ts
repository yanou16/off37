export interface PlaceImage {
  id: string;
  url: string;
  alt: string;
  credit: string;
  creditUrl?: string;
}

export interface Place {
  name: string;
  address: string;
  rating?: number;
  description?: string;
  coordinates?: [number, number]; // [latitude, longitude]
  category?: string;
  images?: PlaceImage[];
}