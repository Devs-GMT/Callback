import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Locale } from "@/i18n/config";
import { getRuntimeLocale } from "@/i18n/lib";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Clamp a number into an inclusive range. */
export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** `1,234` — grouped thousands, no locale surprises between SSR and CSR. */
export function formatCount(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const MONTHS: Record<Locale, string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  id: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"],
  ms: ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"],
};

/**
 * `Oct 31, 2026` in English, `31 Okt 2026` in Indonesian and Malay.
 *
 * Hand-rolled rather than `Intl`, so the server and the browser can never
 * disagree on the output and break hydration. Components pass their locale;
 * client-side helpers fall back to the page's.
 */
export function formatDate(iso: string | number | Date, locale: Locale = getRuntimeLocale()) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const month = MONTHS[locale][d.getMonth()];
  return locale === "en"
    ? `${month} ${d.getDate()}, ${d.getFullYear()}`
    : `${d.getDate()} ${month} ${d.getFullYear()}`;
}

/** `0x12ab…9f3c` — the footer's truncated address form (PRD §13). */
export function shortAddress(address: string, lead = 6, tail = 4) {
  if (!address || address.length <= lead + tail) return address;
  return `${address.slice(0, lead)}…${address.slice(-tail)}`;
}

/** Stable short id for locally stored reports and applications. */
export function localId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
