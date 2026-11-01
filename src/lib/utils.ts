import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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

/** `Oct 31, 2026` */
export function formatDate(iso: string | number | Date) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
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
