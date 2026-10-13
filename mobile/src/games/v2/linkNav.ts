// LinkNav: inbound verified app links. Installed app: https(s)://<host>/l/<code>
// (Android App Links / iOS Universal Links) or sanskritam://l/<code> route to
// the right screen after resolving the share link server-side; attribution
// events record the measurable steps. Uninstalled: the landing page handles
// it (never Firebase Dynamic Links — that service is shut down).

import { useEffect } from "react";
import { Linking } from "react-native";

import { LEGAL_BASE_URL } from "../../config";
import { shareApi } from "./client";

type Nav = { navigate: (r: string, p?: object) => void } | null;

let lastCode = "";

export async function resolveShareCode(code: string, nav: Nav): Promise<void> {
  if (!nav || !code || code === lastCode) return;
  lastCode = code;
  try {
    const resolved = await shareApi.resolve(code);
    void shareApi.event({ code, event: "redeemed" }).catch(() => {});
    const kind = resolved.kind;
    if (kind === "match" || kind === "invite") {
      nav.navigate("RoomLobby", { code });
      return;
    }
    nav.navigate("Play", {});
  } catch {
    // expired/unknown link still lands in the app, at Play
    nav.navigate("Play", {});
  }
}

function codeFromUrl(url: string): string | null {
  try {
    const u = new URL(url.replace("sanskritam://", "https://sanskritam.app/"));
    if (u.pathname.startsWith("/l/")) return u.pathname.slice(3);
    return null;
  } catch {
    return null;
  }
}

export function LinkNav({ navRef }: { navRef: { current: Nav } }) {
  useEffect(() => {
    const handle = (url: string) => {
      const code = codeFromUrl(url);
      if (code) void resolveShareCode(code, navRef.current);
      void shareApi.event({ event: "link_opened", meta: { url } }).catch(() => {});
    };
    void Linking.getInitialURL().then((url) => { if (url) handle(url); }).catch(() => {});
    const sub = Linking.addEventListener("url", ({ url }) => handle(url));
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export const LINK_PREFIXES = [LEGAL_BASE_URL, "sanskritam://"];
