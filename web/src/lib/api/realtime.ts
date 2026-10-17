/**
 * Notifikasi & pembaruan realtime lewat WebSocket Directus (/panel/websocket).
 * Login memakai cookie sesi yang sama (otomatis ikut saat koneksi dibuka).
 * Sambung ulang otomatis kalau koneksi putus (mis. laptop sleep / server restart).
 */
import { API_BASE } from "./config";

export type RealtimeEvent = { collection: string; event: "create" | "update" | "delete"; data: unknown[] };
type Sub = { collection: string; query?: Record<string, unknown> };

export type RealtimeHandle = { close: () => void };

export function connectRealtime(subs: Sub[], onEvent: (e: RealtimeEvent) => void, onStatus?: (connected: boolean) => void): RealtimeHandle {
  let ws: WebSocket | null = null;
  let closed = false;
  let retry = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const open = () => {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    ws = new WebSocket(`${proto}//${window.location.host}${API_BASE}/websocket`);
    ws.onopen = () => {
      retry = 0;
      onStatus?.(true);
      for (const s of subs) ws?.send(JSON.stringify({ type: "subscribe", uid: s.collection, collection: s.collection, query: s.query ?? { fields: ["id"] } }));
    };
    ws.onmessage = (m) => {
      const msg = JSON.parse(String(m.data)) as { type: string; event?: string; uid?: string; data?: unknown[] };
      if (msg.type === "ping") return ws?.send(JSON.stringify({ type: "pong" }));
      if (msg.type === "subscription" && msg.uid && (msg.event === "create" || msg.event === "update" || msg.event === "delete")) {
        onEvent({ collection: msg.uid, event: msg.event, data: msg.data ?? [] });
      }
    };
    ws.onclose = () => {
      onStatus?.(false);
      if (closed) return;
      // Coba lagi: 1s, 2s, 4s … maks 30s.
      timer = setTimeout(open, Math.min(30_000, 1000 * 2 ** retry++));
    };
    ws.onerror = () => ws?.close();
  };

  open();
  return {
    close: () => {
      closed = true;
      clearTimeout(timer);
      ws?.close();
    },
  };
}
