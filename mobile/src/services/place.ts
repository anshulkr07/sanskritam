// Place — the learner's approximate location, for Ask calendar answers.
//
// A tithi or festival date depends on where the learner is (sunrise at
// least). The place goes to the server in the POST body only, never in a
// URL, and only with Ask requests; the server uses it for the calculation
// and does not store or log it. Coordinates are rounded to one decimal
// (about 11 km) before storing, and the label is the nearest bundled city —
// never reverse-geocoded, so no precise address ever exists. No background
// location: permission is asked only when an answer needs it.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useState } from "react";
import * as Location from "expo-location";

import { CITIES, type City } from "../data/cities";

export interface Place {
  lat: number;
  lon: number;
  tz: string;
  label: string;
  source: "device" | "city";
}

const STORE_KEY = "shabd.place";

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Nearest bundled city by flat-earth distance. Good enough for a label. */
export function nearestCity(lat: number, lon: number): City {
  let best = CITIES[0];
  let bestD = Infinity;
  for (const c of CITIES) {
    const dLat = c.lat - lat;
    const dLon = (c.lon - lon) * Math.cos((lat * Math.PI) / 180);
    const d = dLat * dLat + dLon * dLon;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

export async function getPlace(): Promise<Place | null> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Place>;
    if (typeof p.lat !== "number" || typeof p.lon !== "number" || !p.tz || !p.label) {
      return null;
    }
    return {
      lat: p.lat,
      lon: p.lon,
      tz: p.tz,
      label: p.label,
      source: p.source === "device" ? "device" : "city",
    };
  } catch {
    return null;
  }
}

export async function setPlace(place: Place): Promise<void> {
  const rounded: Place = {
    lat: round1(place.lat),
    lon: round1(place.lon),
    tz: place.tz,
    label: place.label,
    source: place.source,
  };
  try {
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(rounded));
  } catch {
    // Storage unavailable: the place still applies to this question.
  }
}

/**
 * Approximate device place, on demand. Requests foreground permission, then
 * the last known position, then one low-power fix. Returns null when denied
 * or unavailable — the caller falls back to the city list.
 */
export function useDevicePlace(): {
  locating: boolean;
  locate: () => Promise<Place | null>;
} {
  const [locating, setLocating] = useState(false);

  const locate = useCallback(async (): Promise<Place | null> => {
    if (locating) return null;
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) return null;
      let pos = await Location.getLastKnownPositionAsync().catch(() => null);
      if (!pos) {
        pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Lowest,
        }).catch(() => null);
      }
      if (!pos) return null;
      const lat = round1(pos.coords.latitude);
      const lon = round1(pos.coords.longitude);
      const city = nearestCity(lat, lon);
      const place: Place = { lat, lon, tz: city.tz, label: city.name, source: "device" };
      await setPlace(place);
      return place;
    } catch {
      return null;
    } finally {
      setLocating(false);
    }
  }, [locating]);

  return { locating, locate };
}
