"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "viec-lam-da-luu";
const CHANGE_EVENT = "saved-jobs-changed";
let cachedRaw: string | null = null;
let cachedIds: number[] = [];
const emptyIds: number[] = [];

export function readSavedJobIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) ?? "[]";
    if (raw === cachedRaw) return cachedIds;
    const value = JSON.parse(raw);
    cachedRaw = raw;
    cachedIds = Array.isArray(value) ? value.filter((id) => Number.isInteger(id)) : [];
    return cachedIds;
  } catch {
    return [];
  }
}

export function writeSavedJobIds(ids: number[]) {
  const raw = JSON.stringify(ids);
  cachedRaw = raw;
  cachedIds = ids;
  window.localStorage.setItem(STORAGE_KEY, raw);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function toggleSavedJob(id: number, current: number[]) {
  const next = current.includes(id)
    ? current.filter((item) => item !== id)
    : [...current, id];
  writeSavedJobIds(next);
  return next;
}

export function useSavedJobIds() {
  return useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener(CHANGE_EVENT, onStoreChange);
      window.addEventListener("storage", onStoreChange);
      return () => {
        window.removeEventListener(CHANGE_EVENT, onStoreChange);
        window.removeEventListener("storage", onStoreChange);
      };
    },
    readSavedJobIds,
    () => emptyIds,
  );
}
