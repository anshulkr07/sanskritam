import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { deviceTimeZone } from "../kala/clock";
import { getPlace, nearestCity, setPlace, type Place } from "../services/place";

async function devicePlace(latitude: number, longitude: number, saved: Place | null): Promise<Place> {
  // Keep the same approximate coordinate precision as the existing place store.
  const lat = Math.round(latitude * 10) / 10;
  const lon = Math.round(longitude * 10) / 10;
  if (saved?.source === "device" && saved.lat === lat && saved.lon === lon) return saved;
  const nearby = nearestCity(lat, lon);
  let label = nearby.name;
  try {
    const [city] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
    // Read only the city; never retain or display street/address fields.
    label = city?.city || city?.subregion || label;
  } catch { /* Offline: the bundled nearest city remains available. */ }
  return { lat, lon, label, tz: deviceTimeZone(), source: "device" };
}

/** Home checks an existing grant only. The chooser requests a grant on a tap. */
export function useHomePlace(active: boolean) {
  const [place, setCurrent] = useState<Place | null>(null);
  const [ready, setReady] = useState(false);
  const revision = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; revision.current++; };
  }, []);

  const refresh = useCallback(async () => {
    const id = ++revision.current;
    const saved = await getPlace();
    if (!mounted.current || id !== revision.current) return;
    setCurrent(saved); setReady(true);
    try {
      const permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted) return;
      const last = await Location.getLastKnownPositionAsync({ maxAge: 15 * 60_000, requiredAccuracy: 10_000 }).catch(() => null);
      const position = last ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      if (!mounted.current || id !== revision.current) return;
      const next = await devicePlace(position.coords.latitude, position.coords.longitude, saved);
      if (!mounted.current || id !== revision.current) return;
      await setPlace(next);
      if (mounted.current && id === revision.current) setCurrent(next);
    } catch { /* Denied, offline or unavailable: retain the saved city. */ }
  }, []);

  useEffect(() => {
    if (!active) return;
    void refresh();
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") void refresh(); });
    return () => { revision.current++; subscription.remove(); };
  }, [active, refresh]);

  const pick = useCallback(async (next: Place) => {
    const id = ++revision.current;
    setCurrent(next); setReady(true);
    await setPlace(next);
    if (next.source === "device") {
      const named = await devicePlace(next.lat, next.lon, null);
      if (!mounted.current || id !== revision.current) return;
      await setPlace(named);
      if (mounted.current && id === revision.current) setCurrent(named);
    }
  }, []);

  return { place, ready, pick };
}
