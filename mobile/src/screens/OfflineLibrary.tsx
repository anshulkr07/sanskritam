import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { listOfflineBooks, type OfflineBook } from "../services/offlineBooks";
import { color } from "../theme";

export default function OfflineLibrary({ navigation }: { navigation: { navigate(route: string, params: object): void } }) {
  const [packs, setPacks] = useState<OfflineBook[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { let alive = true; void listOfflineBooks().then(p => { if (alive) setPacks(p); }).catch(() => { if (alive) setError(true); }); return () => { alive = false; }; }, []);
  return <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }} edges={["bottom"]}>
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text style={{ fontFamily: "Nunito_800ExtraBold", fontSize: 24, color: color.ink }}>Saved reading</Text>
      {!packs && <Text style={{ color: color.ink }}>{error ? "Couldn't load saved reading. Reopen this screen to retry." : "Loading saved chapters…"}</Text>}
      {packs?.length === 0 && <Text style={{ color: color.ink }}>Open a text and choose Save text offline.</Text>}
      {packs?.map(p => <Pressable key={`${p.book}:${p.chapter}`} accessibilityRole="button" accessibilityLabel={`Read ${p.title}${p.chapter ? ` chapter ${p.chapter}` : ""} offline`}
        onPress={() => navigation.navigate(p.medium === "audio" ? "Listen" : "Book", { bookKey: p.book, chapter: p.chapter ?? undefined })}
        style={{ minHeight: 64, borderBottomWidth: 1, borderBottomColor: color.border, justifyContent: "center", gap: 4 }}>
        <Text style={{ fontFamily: "Nunito_700Bold", fontSize: 18, color: color.ink }}>{p.title}{p.chapter ? ` · ${p.chapter}` : ""}</Text>
        <Text style={{ color: color.inkSoft }}>{p.pages.length} passages saved</Text>
      </Pressable>)}
    </ScrollView>
  </SafeAreaView>;
}
