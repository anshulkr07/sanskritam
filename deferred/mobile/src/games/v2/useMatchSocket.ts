// usePlayMatchSocket: the live-match WebSocket over React Native's built-in
// WebSocket. Reconnects within the server's grace window, resends nothing
// (actions are idempotent by idem key), and rebuilds from a snapshot after a
// missed sequence.

import { useEffect, useRef, useState } from "react";

import { BASE_URL } from "../../config";
import { matchApi, wsUrl } from "./client";

export type MatchEvent = { seq: number; type: string; payload: Record<string, unknown> };

export function usePlayMatchSocket(opts: {
  matchId: string | null;
  ticket?: string;
  onEvent: (type: string, payload: Record<string, unknown>) => void;
  onSnapshot: (snapshot: Record<string, unknown>) => void;
}) {
  const [status, setStatus] = useState<"idle" | "connecting" | "open" | "closed">("idle");
  const wsRef = useRef<WebSocket | null>(null);
  const lastSeq = useRef(0);
  const callbacksRef = useRef(opts);
  callbacksRef.current = opts;

  useEffect(() => {
    if (!opts.matchId) { setStatus("idle"); return; }
    let closed = false;
    let retry = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    lastSeq.current = 0;

    const scheduleRetry = () => {
      if (closed) return;
      setStatus("closed");
      retry += 1;
      timer = setTimeout(() => {
        if (closed || !opts.matchId) return;
        void matchApi.ticket(opts.matchId).then((t) => openWith(t.ticket))
          .catch(scheduleRetry);
      }, Math.min(8000, 600 * retry));
    };

    const openWith = (ticket: string) => {
      if (closed) return;
      const ws = new WebSocket(wsUrl(BASE_URL, `/ws/matches/${ticket}`));
      wsRef.current = ws;
      setStatus("connecting");
      ws.onopen = () => { if (!closed) { retry = 0; setStatus("open"); } };
      ws.onmessage = (e) => {
        if (closed) return;
        try {
          const msg = JSON.parse(String(e.data)) as Record<string, unknown>;
          const type = String(msg.type ?? "");
          if (type === "snapshot") {
            const snapshot = (msg.payload ?? {}) as Record<string, unknown>;
            lastSeq.current = Number(snapshot.seq ?? msg.seq ?? 0);
            callbacksRef.current.onSnapshot(snapshot);
          } else if (type === "ack") {
            callbacksRef.current.onEvent("ack", (msg.payload ?? {}) as Record<string, unknown>);
          } else if (type === "error") {
            callbacksRef.current.onEvent("error", { detail: msg.detail, status: msg.status });
          } else if ("seq" in msg) {
            const seq = Number(msg.seq);
            if (seq <= lastSeq.current) return;
            if (seq > lastSeq.current + 1) {
              // gap: ask for the missed events (or the server's snapshot on
              // reconnect covers us)
              ws.send(JSON.stringify({ type: "sync", since: lastSeq.current }));
            }
            lastSeq.current = Math.max(lastSeq.current, seq);
            callbacksRef.current.onEvent(type, (msg.payload ?? {}) as Record<string, unknown>);
          }
        } catch { /* ignore malformed frames */ }
      };
      ws.onclose = () => {
        if (closed) return;
        scheduleRetry();
      };
      ws.onerror = () => { /* onclose follows */ };
    };

    if (opts.ticket) {
      openWith(opts.ticket);
    } else if (opts.matchId) {
      void matchApi.ticket(opts.matchId).then((t) => openWith(t.ticket))
        .catch(scheduleRetry);
    }
    return () => {
      closed = true;
      clearTimeout(timer);
      wsRef.current?.close();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.matchId]);

  const send = (msg: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ ...msg, idem: msg.idem ?? `i-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }));
    }
  };

  return { send, status };
}
