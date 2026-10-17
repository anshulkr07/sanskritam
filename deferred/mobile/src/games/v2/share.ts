// Share: designed result cards (square 1080x1080 and story 1080x1920),
// native share sheet with image + link payload, and scoped share links.
// A share-sheet dismissal is not proof of posting — we only record that the
// sheet was opened, never that something was shared.

import { useRef, useState } from "react";
import { Platform, Share } from "react-native";
import ViewShot from "react-native-view-shot";

export type ViewShotRef = React.ElementRef<typeof ViewShot>;

import { LEGAL_BASE_URL } from "../../config";
import { shareApi } from "./client";

export interface ShareCardData {
  kind: "result" | "rank" | "match" | "recitation" | "number";
  title: string;
  subtitle: string;
  bigValue: string;
  detail: string;
  period?: string;
  nameVisible: boolean;
}

export function useShareCard() {
  const squareRef = useRef<ViewShotRef>(null);
  const storyRef = useRef<ViewShotRef>(null);
  const [sharing, setSharing] = useState(false);

  const capture = async (ref: { current: ViewShotRef | null }): Promise<string | null> => {
    try {
      const uri = await ref.current?.capture?.();
      return uri ?? null;
    } catch {
      return null;
    }
  };

  const share = async (data: ShareCardData, opts: { story?: boolean; code?: string } = {}) => {
    setSharing(true);
    try {
      // 1. A scoped, revocable link for this achievement (opaque code; no ids).
      let url = "";
      let code = opts.code ?? "";
      try {
        const link = await shareApi.createLink({
          kind: data.kind,
          payload: {
            title: data.title, subtitle: data.subtitle, score: data.bigValue,
            detail: data.detail, period: data.period ?? "",
            name: data.nameVisible ? "me" : "",
          },
          ttl: data.kind === "match" ? "invite" : "achievement",
        });
        url = link.url.startsWith("http") ? link.url : `${LEGAL_BASE_URL}${link.url}`;
        code = link.code;
      } catch { /* link optional: share the image alone */ }

      // 2. Capture the designed card.
      const uri = await capture(opts.story ? storyRef : squareRef);

      // 3. Native share sheet with image + caption where the destination
      //    supports both; copy link/save image are offered on failure.
      const message =
        `${data.title} — ${data.bigValue}\n${data.detail}\n${url ? url + "\n" : ""}Sanskritam`;
      if (uri && Platform.OS !== "web") {
        try {
          const Sharing = (await import("expo-sharing")).default;
          if (Sharing && await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, { dialogTitle: data.title, mimeType: "image/png", UTI: "public.png" });
            // caption carries the link
            if (url) await Share.share({ message });
            return { ok: true, code };
          }
        } catch { /* fall through to text share */ }
      }
      await Share.share({ message });
      return { ok: true, code };
    } finally {
      setSharing(false);
    }
  };

  return { squareRef, storyRef, share, sharing };
}
