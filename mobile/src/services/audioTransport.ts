// One transport for speech, recordings, chants and streaming voice. Ownership
// tokens keep a late completion from hiding a newer player's controls.
export type AudioControls = { pause(): void; play(): void };
export type AudioKind = "audio" | "audiobook";
export type AudioSnapshot = {
  id: number; title: string; playing: boolean; minimized: boolean;
  kind: AudioKind;
  position: number; duration: number;
} | null;

let snapshot: AudioSnapshot = null;
let controls: AudioControls | null = null;
let nextId = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());

export const audioTransport = {
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  getSnapshot: () => snapshot,
  claim(title: string, next: AudioControls, kind: AudioKind = "audio"): number {
    try { controls?.pause(); } catch { /* an expired source must not block the next */ }
    const id = ++nextId;
    controls = next;
    snapshot = { id, title, kind, playing: true, minimized: false, position: 0, duration: 0 };
    emit();
    return id;
  },
  update(id: number, patch: Partial<NonNullable<AudioSnapshot>>) {
    if (snapshot?.id !== id) return;
    if (Object.entries(patch).every(([key, value]) => snapshot?.[key as keyof NonNullable<AudioSnapshot>] === value)) return;
    snapshot = { ...snapshot, ...patch, id };
    emit();
  },
  release(id: number) {
    if (snapshot?.id !== id) return;
    snapshot = null; controls = null; emit();
  },
  toggle() { if (snapshot?.playing) controls?.pause(); else controls?.play(); },
  minimize() { if (snapshot) audioTransport.update(snapshot.id, { minimized: true }); },
  expand() { if (snapshot) audioTransport.update(snapshot.id, { minimized: false }); },
};
