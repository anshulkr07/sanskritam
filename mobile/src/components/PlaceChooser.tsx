// PlaceChooser — "Use my location" or a searchable city list.
//
// Typing two letters or more searches every city above 5,000 people on the
// server (GET /places/search, GeoNames), so a place of birth can be Berlin or
// a small town. Without the server (offline, old backend) the bundled list
// below is searched instead.
//
// The approximate place Ask needs for tithi and festival dates. Permission is
// asked only here, when an answer needs it. Denying leaves the city list
// usable. After a choice the caller re-sends the question. Also used from
// Settings, the manual route.

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@react-native-vector-icons/ionicons";

import { api, type PlaceHit } from "../api/client";
import { CITIES } from "../data/cities";
import { setPlace, useDevicePlace, type Place } from "../services/place";
import { haptics } from "../services/haptics";
import { color, font, outline, space } from "../theme";

export default function PlaceChooser({
  onPick,
  remember = true,
  showLocate = true,
}: {
  onPick: (place: Place) => void;
  /** Store the pick as the learner's place. Off for a place of birth. */
  remember?: boolean;
  /** Offer "Use my location". Off for a place of birth, which is not here. */
  showLocate?: boolean;
}) {
  const { locating, locate } = useDevicePlace();
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");

  const [remote, setRemote] = useState<PlaceHit[] | null>(null);
  const asked = useRef(0);

  // The server's search, a moment after typing stops; the newest answer wins.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setRemote(null);
      return;
    }
    const n = ++asked.current;
    const timer = setTimeout(() => {
      api
        .searchPlaces(q)
        .then((hits) => {
          if (n === asked.current) setRemote(hits);
        })
        .catch(() => {
          if (n === asked.current) setRemote(null);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const cities = useMemo(() => {
    if (remote) {
      return remote.map((h) => ({
        key: `${h.label}|${h.lat}|${h.lon}`,
        shown: h.label,
        // Kept short: the name and the country (the state when in India).
        name: [h.name, h.country === "India" ? h.region : h.country].filter(Boolean).join(", "),
        lat: h.lat,
        lon: h.lon,
        tz: h.tz,
      }));
    }
    const q = query.trim().toLowerCase();
    const list = q ? CITIES.filter((c) => c.name.toLowerCase().includes(q)) : CITIES;
    return list.map((c) => ({ key: c.name, shown: c.name, ...c }));
  }, [query, remote]);

  const useLocation = async () => {
    haptics.tap();
    const place = await locate();
    if (place) {
      onPick(place);
    } else {
      setNotice("Location unavailable. Pick a city below.");
    }
  };

  const pickCity = (name: string, lat: number, lon: number, tz: string) => {
    haptics.tap();
    const place: Place = { lat, lon, tz, label: name, source: "city" };
    if (remember) void setPlace(place);
    onPick(place);
  };

  return (
    <View style={styles.wrap}>
      {showLocate && (
        <Pressable
          onPress={useLocation}
          disabled={locating}
          accessibilityRole="button"
          accessibilityLabel="Use my location"
          style={styles.row}
        >
          {locating ? (
            <ActivityIndicator size="small" color={color.ink} />
          ) : (
            <Ionicons name="locate-outline" size={20} color={color.ink} />
          )}
          <Text style={styles.rowText}>Use my location</Text>
          <Text style={styles.rowSub}>Approximate, stored on this phone</Text>
        </Pressable>
      )}

      {!!notice && <Text style={styles.notice}>{notice}</Text>}

      <View style={styles.search}>
        <Ionicons name="search" size={16} color={color.inkFaint} />
        <TextInput
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            setNotice("");
          }}
          placeholder="Choose a city"
          placeholderTextColor={color.inkFaint}
          style={styles.searchInput}
          accessibilityLabel="Choose a city"
        />
      </View>

      <FlatList
        data={cities}
        keyExtractor={(c) => c.key}
        keyboardShouldPersistTaps="handled"
        style={styles.list}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => pickCity(item.name, item.lat, item.lon, item.tz)}
            accessibilityRole="button"
            accessibilityLabel={item.shown}
            style={styles.city}
          >
            <Text style={styles.cityText}>{item.shown}</Text>
            <Ionicons name="chevron-forward" size={16} color={color.inkFaint} />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm, paddingTop: space.xs },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    minHeight: 48,
    paddingVertical: space.xs,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  rowText: {
    fontFamily: "Nunito_700Bold",
    fontWeight: "700",
    fontSize: font.sizes.base,
    color: color.ink,
  },
  rowSub: {
    marginLeft: "auto",
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.xs,
    color: color.inkFaint,
  },
  notice: {
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    fontSize: font.sizes.sm,
    color: color.badText,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    minHeight: 44,
    paddingHorizontal: space.sm,
    borderWidth: 1.5,
    borderColor: outline,
    borderRadius: 12,
    backgroundColor: color.white,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Nunito_600SemiBold",
    fontSize: font.sizes.base,
    color: color.ink,
    paddingVertical: 8,
  },
  list: { maxHeight: 280 },
  city: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
    minHeight: 44,
  },
  cityText: {
    flex: 1,
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
    fontSize: font.sizes.base,
    color: color.ink,
  },
});
