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
  const seqRef = useRef(0);
  const ticketRef = useRef(opts.ticket);
  const lastSeq = useRef(0);

  useEffect(() => { ticketRef.current = opts.ticket; }, [opts.ticket]);

  useEffect(() => {
    if (!opts.matchId) return;
    let closed = false;
    let retry = 0;

    const connect = () => {
      const openWith = (ticket: string) => {
        const ws = new WebSocket(wsUrl(BASE_URL, `/ws/matches/${ticket}`));
        wsRef.current = ws;
        setStatus("connecting");
        ws.onopen = () => { retry = 0; setStatus("open"); };
        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(String(e.data)) as Record<string, unknown>;
            const type = String(msg.type ?? "");
            if (type === "snapshot") {
              seqRef.current = Number(msg.seq ?? 0);
              lastSeq.current = seqRef.current;
              opts.onSnapshot((msg.payload ?? {}) as Record<string, unknown>);
            } else if (type === "ack") {
              opts.onEvent("ack", (msg.payload ?? {}) as Record<string, unknown>);
            } else if ("seq" in msg) {
              const seq = Number(msg.seq);
              if (seq > lastSeq.current + 1) {
                // gap: ask for the missed events (or the server's snapshot on
                // reconnect covers us)
                ws.send(JSON.stringify({ type: "sync", since: lastSeq.current }));
              }
              lastSeq.current = Math.max(lastSeq.current, seq);
              opts.onEvent(type, (msg.payload ?? {}) as Record<string, unknown>);
            }
          } catch { /* ignore malformed frames */ }
        };
        ws.onclose = () => {
          setStatus("closed");
          if (closed) return;
          // reconnect within the grace window with a fresh ticket
          retry += 1;
          if (retry > 5) return;
          setTimeout(async () => {
            if (closed || !opts.matchId) return;
            try {
              const t = await matchApi.ticket(opts.matchId);
              openWith(t.ticket);
            } catch { /* stay closed */ }
          }, Math.min(8000, 600 * retry));
        };
        ws.onerror = () => { /* onclose follows */ };
      };

      if (ticketRef.current) {
        openWith(ticketRef.current);
      } else if (opts.matchId) {
        void matchApi.ticket(opts.matchId).then((t) => openWith(t.ticket))
          .catch(() => setStatus("closed"));
      }
    };

    connect();
    return () => {
      closed = true;
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
