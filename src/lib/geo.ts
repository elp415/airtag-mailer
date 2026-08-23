import type { Leg, Sighting } from "../types";

export const AIR_THRESHOLD_MPH = 110;
const EARTH_RADIUS_MILES = 3958.8;
const MIN_LEG_HOURS = 1 / 60; // clamp: avoids divide-by-zero on duplicate timestamps

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;

export function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(a));
}

export function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lng2 - lng1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function buildLegs(sightings: Sighting[]): Leg[] {
  const sorted = [...sightings].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
  );
  const legs: Leg[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const from = sorted[i - 1];
    const to = sorted[i];
    const hours = Math.max(MIN_LEG_HOURS, (new Date(to.time).getTime() - new Date(from.time).getTime()) / 3_600_000);
    const distanceMiles = haversineMiles(from.lat, from.lng, to.lat, to.lng);
    const speedMph = distanceMiles / hours;
    legs.push({
      from,
      to,
      distanceMiles,
      hours,
      speedMph,
      mode: speedMph > AIR_THRESHOLD_MPH ? "air" : "ground",
      bearingDeg: bearingDeg(from.lat, from.lng, to.lat, to.lng),
      midLat: (from.lat + to.lat) / 2,
      midLng: (from.lng + to.lng) / 2,
    });
  }
  return legs;
}

export function sortSightings(sightings: Sighting[]): Sighting[] {
  return [...sightings].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
  );
}
