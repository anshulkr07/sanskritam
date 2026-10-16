import React, { useEffect, useState } from "react";
import { Image, type ImageProps, type ImageURISource } from "react-native";
import { cachedArtworkUri, isManagedArtwork, retainArtwork } from "../../services/artworkCache";

/** Preserve native Image behavior; public artwork additionally gets bounded disk caching. */
export function ArtworkImage({ source, ...props }: ImageProps) {
  const remote = source && !Array.isArray(source) && typeof source === "object" ? source as ImageURISource : undefined;
  const uri = remote?.uri ?? "";
  const managed = isManagedArtwork(uri);
  const [resolved, setResolved] = useState({ remote: "", local: "" });
  useEffect(() => {
    if (!managed) return;
    let alive = true;
    const release = retainArtwork(uri);
    cachedArtworkUri(uri).then(local => { if (alive) setResolved({ remote: uri, local }); })
      .catch(() => { if (alive) setResolved({ remote: uri, local: uri }); });
    return () => { alive = false; release(); };
  }, [uri, managed]);
  const actual = !managed ? source : resolved.remote === uri ? { ...remote, uri: resolved.local } : undefined;
  return <Image {...props} source={actual} />;
}
