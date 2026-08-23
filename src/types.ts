export interface Sighting {
  time: string;
  lat: number;
  lng: number;
  label?: string;
}

export interface SightingData {
  sightings: Sighting[];
}

export type TravelMode = "air" | "ground";

export interface Leg {
  from: Sighting;
  to: Sighting;
  distanceMiles: number;
  hours: number;
  speedMph: number;
  mode: TravelMode;
  bearingDeg: number;
  midLat: number;
  midLng: number;
}
