// useToday — the live calendar reading behind the Home card.
//
// Everything is worked out on the phone: nothing is sent anywhere, and the
// card works with no network and against any backend. The astronomy library
// loads on the first reading, after the first frame, so Home never waits on
// it.
//
// The slow reading (a snapshot) is taken when the card first shows, when the
// learner changes tradition or place, and when the snapshot says it has gone
// stale (a tithi or nakshatra ended, the Sun rose, the date turned). In
// between, a one-minute tick only moves the Moon and the bar.
//
// The Kāla screens use the same hook, so the last snapshot is kept between
// screens: opening the hub from the card does not work the sky out again.

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";

import { CITIES } from "../data/cities";
import { getPlace } from "../services/place";
import { clockTextFor, deviceTimeZone, wallClockAt, whenTextFor } from "./clock";
import { getKalaPrefs, loadKalaPrefs, subscribeKalaPrefs, type KalaPrefs } from "./prefs";
import { cardView, snapshot, type CardView, type Snapshot } from "./today";
import { traditionById, type KalaPlace } from "./traditions";

/** Where a place came from: the learner chose it, or it is a stand-in. */
export type PlaceSource = "chosen" | "timezone" | "tradition";

export interface ResolvedPlace {
  place: KalaPlace;
  source: PlaceSource;
}

/** The place to work the calendar out for. The learner's own if they have
 *  set one (Settings, or Ask's chooser). Otherwise the tradition's city when
 *  the phone is in that city's time zone, else the first listed city in the
 *  phone's zone. Never asks for location. */
export function resolvePlace(stored: KalaPlace | null, traditionId: string): ResolvedPlace {
  if (stored) return { place: stored, source: "chosen" };
  const city = traditionById(traditionId).city;
  const tz = deviceTimeZone();
  if (tz === city.tz) return { place: city, source: "tradition" };
  const inZone = CITIES.find((c) => c.tz === tz);
  if (inZone) return { place: { label: inZone.name, lat: inZone.lat, lon: inZone.lon, tz: inZone.tz }, source: "timezone" };
  return { place: city, source: "tradition" };
}

/** The latest reading, shared by every screen that asks for one. */
let lastSnap: Snapshot | null = null;

export interface TodayState {
  /** Null until the first reading lands. */
  view: CardView | null;
  /** The reading itself, for the screens that draw more than the card. */
  snap: Snapshot | null;
  /** The moment the card was last drawn for: it moves once a minute. */
  now: Date;
  /** Writes an instant as a time of day at the place: "12:36". */
  clockText: (d: Date) => string;
  /** Writes an instant as a day and a time when it is not today. */
  whenText: (d: Date) => string;
  prefs: KalaPrefs;
  place: ResolvedPlace;
  /** The reading could not be made. `retry` tries again. */
  failed: boolean;
  retry: () => void;
  /** Re-read the stored place (after the chooser closes). */
  refreshPlace: () => void;
}

/** `active` is whether the card is on a focused screen. Off-screen it holds
 *  its last reading and does no work. */
export function useToday(active: boolean, suppliedPlace?: KalaPlace | null): TodayState {
  const [prefs, setPrefs] = useState<KalaPrefs>(getKalaPrefs);
  const [stored, setStored] = useState<KalaPlace | null>(null);
  const [placeLoaded, setPlaceLoaded] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [snap, setSnapState] = useState<Snapshot | null>(() =>
    lastSnap && lastSnap.traditionId === getKalaPrefs().tradition && Date.now() < lastSnap.validUntil.getTime() ? lastSnap : null,
  );
  const setSnap = useCallback((next: Snapshot) => {
    lastSnap = next;
    setSnapState(next);
  }, []);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const refreshPlace = useCallback(() => {
    getPlace()
      .then((p) => setStored(p ? { lat: p.lat, lon: p.lon, tz: p.tz, label: p.label } : null))
      .catch(() => null)
      .then(() => setPlaceLoaded(true));
  }, []);

  useEffect(() => {
    const unsub = subscribeKalaPrefs(() => setPrefs(getKalaPrefs()));
    void loadKalaPrefs();
    refreshPlace();
    return unsub;
  }, [refreshPlace]);

  // The place may have been set elsewhere (Settings, Ask) while away.
  useEffect(() => {
    if (active) refreshPlace();
  }, [active, refreshPlace]);

  const place = useMemo(() => resolvePlace(suppliedPlace === undefined ? stored : suppliedPlace, prefs.tradition), [stored, suppliedPlace, prefs.tradition]);
  const { lat, lon, tz } = place.place;

  // One tick a minute, on the minute, while the card is in view.
  useEffect(() => {
    if (!active) return;
    setNow(new Date());
    // Android returns a number. Keep the handle separate from any metadata:
    // attaching an interval handle to it crashed the UI at the first minute tick.
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        setNow(new Date());
        schedule();
      }, 60000 - (Date.now() % 60000) + 40);
    };
    schedule();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") setNow(new Date());
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [active]);

  // Take a reading when there is none, when it is for another tradition or
  // place, or when it has gone stale.
  const fresh =
    snap !== null &&
    snap.traditionId === prefs.tradition &&
    snap.place.lat === lat &&
    snap.place.lon === lon &&
    snap.place.tz === tz &&
    now.getTime() < snap.validUntil.getTime();

  useEffect(() => {
    if (!active || (suppliedPlace === undefined && !placeLoaded) || fresh || failed) return;
    // Off the current frame: the first reading loads the astronomy tables.
    // A change of tradition or place before it runs cancels and reschedules.
    const timer = setTimeout(() => {
      try {
        const at = new Date();
        setSnap(snapshot(at, wallClockAt(at, tz), place.place, prefs.tradition));
        setNow(at);
      } catch (err) {
        console.warn("[kala] could not work out today:", err);
        setFailed(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [active, placeLoaded, suppliedPlace, fresh, failed, attempt, tz, place.place, prefs.tradition, setSnap]);

  const current = snap && snap.traditionId === prefs.tradition &&
    (suppliedPlace === undefined || (snap.place.lat === lat && snap.place.lon === lon && snap.place.tz === tz)) ? snap : null;
  const zone = current ? current.place.tz : tz;
  const clockText = useMemo(() => clockTextFor(zone, now), [zone, now]);
  const whenText = useMemo(() => whenTextFor(zone, now), [zone, now]);

  const view = useMemo(() => {
    if (!current) return null;
    try {
      return cardView(current, now, prefs.script, clockText);
    } catch (err) {
      console.warn("[kala] could not read the snapshot:", err);
      return null;
    }
  }, [current, now, prefs.script, clockText]);

  const retry = useCallback(() => {
    setFailed(false);
    setAttempt((n) => n + 1);
  }, []);

  return { view, snap: current, now, clockText, whenText, prefs, place, failed, retry, refreshPlace };
}
