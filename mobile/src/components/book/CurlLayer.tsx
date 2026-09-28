// CurlLayer (web and default) — no curl.
//
// Skia cannot snapshot React Native views on web (makeImageFromView needs a
// hand-written web path) and CanvasKit is not loaded in that bundle, so on web
// pages turn instantly — the same path Reduce Motion takes. The native twin,
// CurlLayer.native.tsx, exports the same names; Metro picks it on iOS and
// Android, so Skia never enters the web bundle.

import type { ReactElement } from "react";
import type { View } from "react-native";

import type { CurlLayerProps, SheetImage } from "./curlMath";

export const CURL_SUPPORTED: boolean = false;

export function snapshot(_node: View): Promise<SheetImage | null> {
  return Promise.resolve(null);
}

export function CurlLayer(_props: CurlLayerProps): ReactElement | null {
  return null;
}
