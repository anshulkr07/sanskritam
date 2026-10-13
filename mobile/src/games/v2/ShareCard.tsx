// ShareResultCard: the designed share card (square + story variants) that
// the share flow captures with view-shot. Deep fill, cream text, QR to the
// share link, small app brand — never reveals an active daily puzzle's
// solution or a private opponent's identity.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import ViewShot from "react-native-view-shot";

type ViewShotRef = React.ElementRef<typeof ViewShot>;

import { color, fill, onFill, radius, script, space } from "../../theme";

export interface ShareCardProps {
  squareRef: React.RefObject<ViewShotRef | null>;
  storyRef: React.RefObject<ViewShotRef | null>;
  url: string;
  title: string;
  subtitle: string;
  bigValue: string;
  detail: string;
  period?: string;
  name?: string;
}

export function ShareCards(p: ShareCardProps) {
  return (
    <View style={styles.offscreen} pointerEvents="none" aria-hidden>
      <ViewShot ref={p.squareRef} options={{ format: "png", quality: 1, width: 1080, height: 1080 }}>
        <Card variant="square" {...p} />
      </ViewShot>
      <ViewShot ref={p.storyRef} options={{ format: "png", quality: 1, width: 1080, height: 1920 }}>
        <Card variant="story" {...p} />
      </ViewShot>
    </View>
  );
}

function Card({ variant, title, subtitle, bigValue, detail, period, url, name }: ShareCardProps & { variant: "square" | "story" }) {
  const tall = variant === "story";
  return (
    <View style={[styles.card, tall ? styles.cardStory : styles.cardSquare]}>
      <Text style={styles.brand}>संस्कृतम् · Sanskritam</Text>
      <View style={{ flex: 1, justifyContent: "center", gap: 6 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Text style={[styles.big, tall && styles.bigStory]}>{bigValue}</Text>
        <Text style={styles.detail}>{detail}</Text>
        {!!name && <Text style={styles.name}>{name}</Text>}
      </View>
      <View style={styles.footer}>
        <View style={{ flex: 1, gap: 2 }}>
          {!!period && <Text style={styles.period}>{period}</Text>}
          <Text style={styles.cta}>Play me in Sanskritam</Text>
        </View>
        {!!url && (
          <QRCode value={url} size={tall ? 132 : 108} color={onFill.text} backgroundColor="transparent" />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  offscreen: { position: "absolute", left: -9999, top: -9999, opacity: 0 },
  card: {
    backgroundColor: fill.ink, padding: 56, gap: 12,
    justifyContent: "space-between",
  },
  cardSquare: { width: 1080, height: 1080, borderRadius: 0 },
  cardStory: { width: 1080, height: 1920, borderRadius: 0 },
  brand: { color: onFill.gold, fontSize: 30, fontWeight: "800", letterSpacing: 1 },
  title: { color: onFill.text, fontSize: 52, fontWeight: "800" },
  subtitle: { color: onFill.soft, fontSize: 34, lineHeight: 46 },
  big: { color: onFill.text, fontSize: 140, fontWeight: "800", fontVariant: ["tabular-nums"] },
  bigStory: { fontSize: 180 },
  detail: { color: onFill.soft, fontSize: 32, lineHeight: 44 },
  name: { color: onFill.gold, fontSize: 30, fontWeight: "700" },
  footer: { flexDirection: "row", alignItems: "center", gap: 24 },
  period: { color: onFill.faint, fontSize: 26 },
  cta: { color: onFill.text, fontSize: 34, fontWeight: "800" },
});
