// CurlLayer (iOS and Android) — draws the turning sheet with Skia.
//
// The sheet is a snapshot of a live page (makeImageFromView) bent round a
// cylinder by the curl shader in curlMath: transparent wherever the sheet has
// lifted away, so the live page beneath shows through, with the curl's shadow
// falling on it. The web twin (CurlLayer.tsx) draws nothing — Skia never
// enters that bundle.

import {
  Canvas,
  Fill,
  ImageShader,
  Shader,
  Skia,
  makeImageFromView,
  type SkImage,
  type SkRuntimeEffect,
} from "@shopify/react-native-skia";
import React from "react";
import { StyleSheet, type View } from "react-native";
import { useDerivedValue } from "react-native-reanimated";

import { CURL_SHADOW, CURL_SKSL, type CurlLayerProps, type SheetImage } from "./curlMath";

// A failing Skia native module degrades to "no curl" (the book slides)
// instead of throwing at import and redboxing the whole Read screen.
let effect: SkRuntimeEffect | null = null;
let blank: SkImage | null = null;
try {
  effect = Skia.RuntimeEffect.Make(CURL_SKSL);
  // The shader must always have its page: an ImageShader without an image
  // declares nothing and leaves the runtime effect childless. A 1×1 transparent
  // stand-in fills in whenever no sheet is up.
  blank = Skia.Surface.Make(1, 1)?.makeImageSnapshot() ?? null;
} catch {
  effect = null;
  blank = null;
}

export const CURL_SUPPORTED: boolean = effect !== null && blank !== null;

export function snapshot(node: View): Promise<SheetImage | null> {
  try {
    return makeImageFromView({ current: node }).catch(() => null);
  } catch {
    return Promise.resolve(null);
  }
}

export function CurlLayer({ width, height, image, shape, back }: CurlLayerProps) {
  const page = useDerivedValue(() => image.value ?? blank);
  const opacity = useDerivedValue(() => (image.value ? 1 : 0));
  const uniforms = useDerivedValue(() => {
    const s = shape.value;
    const b = back.value;
    return {
      pageSize: [width, height],
      axis: s.axis,
      dir: s.dir,
      radius: s.radius,
      backTint: [b[0], b[1], b[2]],
      showThrough: b[3],
      shadow: CURL_SHADOW,
    };
  });

  if (!effect || !blank) return null;

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Fill opacity={opacity}>
        <Shader source={effect} uniforms={uniforms}>
          <ImageShader image={page} fit="fill" rect={{ x: 0, y: 0, width, height }} />
        </Shader>
      </Fill>
    </Canvas>
  );
}
