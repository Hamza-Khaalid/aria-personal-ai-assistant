import dotenv from "dotenv";
dotenv.config();

export interface TravelInfo {
  origin: string;
  destination: string;
  durationMinutes: number;
  durationText: string;
  distanceText: string;
}

async function geocode(place: string): Promise<[number, number] | null> {
  const apiKey = process.env.OPENROUTE_API_KEY;

  const url = `https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(place)}&size=1`;

  const response = await fetch(url);
  const data = await response.json() as any;

  const coords = data?.features?.[0]?.geometry?.coordinates;
  if (!coords) return null;

  // OpenRouteService returns [longitude, latitude]
  return [coords[0], coords[1]];
}

export async function getTravelTime(origin: string, destination: string): Promise<TravelInfo | null> {
  const apiKey = process.env.OPENROUTE_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTE_API_KEY not found in .env file");
  }

  // Step 1 — Convert place names to coordinates
  console.log(`📍 Looking up: ${origin}`);
  const originCoords = await geocode(origin);
  if (!originCoords) {
    console.error("Could not find origin location:", origin);
    return null;
  }

  console.log(`📍 Looking up: ${destination}`);
  const destCoords = await geocode(destination);
  if (!destCoords) {
    console.error("Could not find destination location:", destination);
    return null;
  }

  // Step 2 — Get driving directions
  const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${originCoords[0]},${originCoords[1]}&end=${destCoords[0]},${destCoords[1]}`;

  const response = await fetch(url);
  const data = await response.json() as any;

  const segment = data?.features?.[0]?.properties?.segments?.[0];
  if (!segment) {
    console.error("No route found.");
    return null;
  }

  const durationSeconds = segment.duration;
  const distanceMeters = segment.distance;
  const durationMinutes = Math.ceil(durationSeconds / 60);

  // Format duration
  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;
  const durationText = hours > 0 ? `${hours}h ${mins}min` : `${mins} min`;

  // Format distance
  const distanceKm = (distanceMeters / 1000).toFixed(1);
  const distanceText = `${distanceKm} km`;

  return {
    origin,
    destination,
    durationMinutes,
    durationText,
    distanceText,
  };
}

export function adjustEventTime(eventTime: string, travelMinutes: number): string {
  const [hours, minutes] = eventTime.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes - travelMinutes;

  const adjustedHours = Math.floor(totalMinutes / 60);
  const adjustedMins = totalMinutes % 60;

  return `${String(adjustedHours).padStart(2, "0")}:${String(adjustedMins).padStart(2, "0")}`;
}