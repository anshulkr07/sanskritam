import React, { useEffect, useState } from "react";
import { Image, Platform, StyleSheet } from "react-native";
import { useAuth } from "../store/auth";
import { BASE_URL } from "../config";

/** Private images always use this account's bearer token, never a public bucket URL. */
export default function ProfileImage({ uri }: { uri?: string | null }) {
  const { token } = useAuth();
  const [blobSource, setBlobSource] = useState<{ path: string; token: string; uri: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const path = uri?.startsWith("/people/") ? uri : null;
  useEffect(() => {
    setFailed(false);
    setBlobSource(null);
    if (!path || !token || Platform.OS !== "web") return;
    let alive = true;
    let url: string | undefined;
    const abort = new AbortController();
    void fetch(BASE_URL + path, { headers: { Authorization: `Bearer ${token}` }, signal: abort.signal })
      .then(async response => {
        if (!response.ok) throw Error("Photo unavailable");
        const blob = await response.blob();
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setBlobSource({ path, token, uri: url });
      }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; abort.abort(); if (url) URL.revokeObjectURL(url); };
  }, [path, token]);
  const blobUrl = blobSource?.path === path && blobSource.token === token ? blobSource.uri : null;
  if (!path || !token || failed || (Platform.OS === "web" && !blobUrl)) return null;
  return <Image source={Platform.OS === "web" ? { uri: blobUrl! } : { uri: BASE_URL + path, headers: { Authorization: `Bearer ${token}` } }}
    onError={() => setFailed(true)} style={StyleSheet.absoluteFill} resizeMode="cover" accessible={false} />;
}
