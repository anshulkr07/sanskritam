// Grammar guide on the device — read marks, the last topic opened, and the
// last good copy of the guide for offline reading.
//
// Reading the guide writes nothing to the server (same rule as the story
// deck): progress lives in AsyncStorage. Both languages arrive in one payload,
// so a cached topic still switches between English and Hindi offline.

import AsyncStorage from "@react-native-async-storage/async-storage";

import { api, type GuideIndex, type GuideTopic } from "../api/client";

const READ_KEY = "shabd.grammar.read";
const LAST_KEY = "shabd.grammar.last";
const INDEX_KEY = "shabd.grammar.index";
const topicKey = (id: string) => `shabd.grammar.topic.${id}`;

type Listener = () => void;
const listeners = new Set<Listener>();
let readIds: Set<string> | null = null;
let lastTopic: string | null = null;

function notify(): void {
  for (const l of listeners) {
    try {
      l();
    } catch {
      /* a dead listener never blocks the others */
    }
  }
}

async function ensureLoaded(): Promise<void> {
  if (readIds) return;
  try {
    const [r, l] = await Promise.all([AsyncStorage.getItem(READ_KEY), AsyncStorage.getItem(LAST_KEY)]);
    readIds = new Set(r ? (JSON.parse(r) as string[]) : []);
    lastTopic = l;
  } catch {
    readIds = new Set();
    lastTopic = null;
  }
}

export function subscribeGrammarProgress(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export async function loadGrammarProgress(): Promise<{ read: Set<string>; last: string | null }> {
  await ensureLoaded();
  return { read: new Set(readIds), last: lastTopic };
}

export async function setTopicRead(id: string, read: boolean): Promise<void> {
  await ensureLoaded();
  if (read) readIds!.add(id);
  else readIds!.delete(id);
  AsyncStorage.setItem(READ_KEY, JSON.stringify([...readIds!])).catch(() => {});
  notify();
}

export async function setLastTopic(id: string): Promise<void> {
  await ensureLoaded();
  if (lastTopic === id) return;
  lastTopic = id;
  AsyncStorage.setItem(LAST_KEY, id).catch(() => {});
  notify();
}

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** The guide index, falling back to the last good copy when offline. */
export async function fetchGuideIndex(): Promise<GuideIndex> {
  try {
    const index = await api.guideIndex();
    AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index)).catch(() => {});
    return index;
  } catch (e) {
    const cached = await readJson<GuideIndex>(INDEX_KEY);
    if (cached) return cached;
    throw e;
  }
}

/** One topic, falling back to the last good copy when offline. */
export async function fetchGuideTopic(id: string): Promise<GuideTopic> {
  try {
    const topic = await api.guideTopic(id);
    AsyncStorage.setItem(topicKey(id), JSON.stringify(topic)).catch(() => {});
    return topic;
  } catch (e) {
    const cached = await readJson<GuideTopic>(topicKey(id));
    if (cached) return cached;
    throw e;
  }
}
