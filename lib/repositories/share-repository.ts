import type { Document } from "../types";

const SHARE_KEY = "konjac.local-shares.v1";

export function saveLocalShare(slug: string, document: Document) {
  const current = readLocalShares();
  current[slug] = document;
  window.localStorage.setItem(SHARE_KEY, JSON.stringify(current));
}

export function readLocalShare(slug: string) {
  return readLocalShares()[slug] ?? null;
}

export function deleteLocalShare(slug: string) {
  const current = readLocalShares();
  delete current[slug];
  window.localStorage.setItem(SHARE_KEY, JSON.stringify(current));
}

function readLocalShares(): Record<string, Document> {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(SHARE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, Document>;
  } catch {
    return {};
  }
}

