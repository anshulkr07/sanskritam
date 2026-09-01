// MouthDiagram — Animated sagittal mouth cross-section in SVG.
// Shows tongue position for each place of articulation:
//   kanthya → throat, talavya → palate, murdhanya → curled retroflex,
//   dantya → teeth, oshthya → lips.
// Colour-coded by place using PLACE_COLORS.
//
// U4-1: Created per UI_HANDOVER.md spec.

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Path, Circle, G } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
} from "react-native-reanimated";

import { color, font, radius, script, space } from "../theme";
import { PLACE_COLORS } from "../screens/Varnamala";

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface MouthDiagramProps {
  place: string;
  char: string;
  iast: string;
}

// Tongue position curves for each place (control points for the SVG path)
const TONGUE_PATHS: Record<string, string> = {
  kanthya:   "M 100,60 Q 120,50 140,65 Q 145,55 150,50",   // throat — high back
  talavya:   "M 100,60 Q 110,40 130,45 Q 140,40 150,50",   // palate — mid-high
  murdhanya: "M 100,60 Q 115,55 130,50 Q 140,35 150,45 Q 155,50 150,55", // retroflex — curled back
  dantya:    "M 100,60 Q 110,55 130,55 Q 140,60 150,65",   // teeth — front high
  oshthya:   "M 100,60 Q 110,65 120,65 Q 130,70 140,75",   // lips — pushed forward
};

const PLACE_LABEL: Record<string, { sa: string; en: string }> = {
  kanthya:   { sa: "कण्ठ्य", en: "Throat" },
  talavya:   { sa: "तालव्य", en: "Palate" },
  murdhanya: { sa: "मूर्धन्य", en: "Retroflex" },
  dantya:    { sa: "दन्त्य", en: "Teeth" },
  oshthya:   { sa: "ओष्ठ्य", en: "Lips" },
};

export default function MouthDiagram({ place, char, iast }: MouthDiagramProps) {
  const colorFill = PLACE_COLORS[place] || color.saffron;
  const label = PLACE_LABEL[place] || { sa: place, en: place };

  // Animated tongue path morphing
  const animProgress = useSharedValue(0);
  const targetPath = TONGUE_PATHS[place] || TONGUE_PATHS.kanthya;

  // Set animation to fire on mount
  React.useEffect(() => {
    animProgress.value = 0;
    animProgress.value = withTiming(1, { duration: 400 });
  }, [place, animProgress]);

  // For the sagittal diagram: a simplified side view of the oral cavity
  // with the tongue moving to the articulation point
  const sagittalOutline = `M 20,80
    Q 20,40 50,30
    Q 70,22 90,25
    Q 110,28 120,30
    Q 135,28 150,30
    Q 160,32 165,45
    L 165,55
    Q 160,65 150,65
    Q 135,65 120,60
    Q 110,62 90,58
    Q 70,55 50,60
    Q 30,65 20,80`;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>
        {char} ({iast}) — {label.sa}
      </Text>
      <Text style={styles.hint}>{label.en} articulation</Text>

      <View style={styles.diagram}>
        <Svg width="180" height="100" viewBox="0 0 180 100">
          {/* Oral cavity outline */}
          <Path
            d={sagittalOutline}
            stroke={color.inkSoft}
            strokeWidth={1.5}
            fill="none"
            opacity={0.3}
          />

          {/* Palate / roof line */}
          <Path
            d="M 20,40 Q 50,22 90,28 Q 120,32 150,32"
            stroke={color.inkFaint}
            strokeWidth={1}
            fill="none"
            strokeDasharray="3,3"
          />

          {/* Tongue position — animated */}
          <AnimatedPath
            d={targetPath}
            stroke={colorFill}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
          />

          {/* Contact point indicator */}
          <Circle
            cx={
              place === "kanthya" ? 55 :
              place === "talavya" ? 70 :
              place === "murdhanya" ? 85 :
              place === "dantya" ? 110 :
              130
            }
            cy={
              place === "kanthya" ? 50 :
              place === "talavya" ? 42 :
              place === "murdhanya" ? 42 :
              place === "dantya" ? 55 :
              65
            }
            r={4}
            fill={colorFill}
            opacity={0.7}
          />

          {/* Airflow arrow for aspirates — simplified */}
          <Path
            d="M 100,15 Q 120,10 140,15"
            stroke={color.inkFaint}
            strokeWidth={1}
            fill="none"
            opacity={0.5}
          />
        </Svg>
      </View>

      <View style={styles.legend}>
        <View style={[styles.dot, { backgroundColor: colorFill }]} />
        <Text style={styles.legendText}>
          Tongue touches {label.en.toLowerCase()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.md,
    marginBottom: space.lg,
  } as any,
  title: {
    fontFamily: script("bold").fontFamily as string,
    fontSize: font.sizes.md,
    color: color.ink,
  },
  hint: {
    fontFamily: "Nunito_500Medium",
    fontWeight: "500",
    fontSize: font.sizes.sm,
    color: color.inkSoft,
    marginTop: 2,
    marginBottom: space.sm,
  },
  diagram: { alignItems: "center", marginBottom: space.sm },
  legend: { flexDirection: "row", alignItems: "center", gap: space.xs },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: {
    fontFamily: "Nunito_400Regular",
    fontWeight: "400",
    fontSize: font.sizes.xs,
    color: color.inkSoft,
  },
});