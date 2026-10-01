// PlaceChooser — "Use my location" or a searchable city list.
//
// The approximate place Ask needs for tithi and festival dates. Permission is
// asked only here, when an answer needs it. Denying leaves the city list
// usable. After a choice the caller re-sends the question. Also used from
// Settings, the manual route.

import React, { useMemo, useState } from "react";
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

import { CITIES } from "../data/cities";
import { setPlace, useDevicePlace, type Place } from "../services/place";
import { haptics } from "../services/haptics";
import { color, font, outline, space } from "../theme";

export default function PlaceChooser({ onPick }: { onPick: (place: Place) => void }) {
  const { locating, locate } = useDevicePlace();
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");

  const cities = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CITIES;
    return CITIES.filter((c) => c.name.toLowerCase().includes(q));
  }, [query]);

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
    void setPlace(place);
    onPick(place);
  };

  return (
    <View style={styles.wrap}>
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
        keyExtractor={(c) => c.name}
        keyboardShouldPersistTaps="handled"
        style={styles.list}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => pickCity(item.name, item.lat, item.lon, item.tz)}
            accessibilityRole="button"
            accessibilityLabel={item.name}
            style={styles.city}
          >
            <Text style={styles.cityText}>{item.name}</Text>
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
