/**
 * Local persistence.
 *
 * PRD section 3 is firm: reports and applications are saved only in this
 * browser, every access is wrapped in try/catch, and a single button clears
 * everything. Nothing in here ever talks to a server.
 *
 * localStorage throws rather than returning null in several real situations —
 * Safari private browsing, blocked site data, a full quota — so every read and
 * write goes through `safeRead`/`safeWrite` and the app degrades to working
 * without history rather than crashing.
 */

import type { ApplicationRow, ApplicationStatus, Report } from "@/lib/types";

const KEYS = {
  reports: "callback.reports.v1",
  salt: "callback.salt.v1",
  consentSeen: "callback.notice.v1",
} as const;

/** Keep the history bounded so a long-lived browser profile cannot fill up. */
const MAX_REPORTS = 40;

/* -------------------------------------------------------------------------- */
/* Guarded access                                                             */
/* -------------------------------------------------------------------------- */

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    const probe = window.localStorage;
    // Touch it: in some privacy modes the property exists but every call throws.
    const key = "callback.probe";
    probe.setItem(key, "1");
    probe.removeItem(key);
    return probe;
  } catch {
    return null;
  }
}

export function isStorageAvailable(): boolean {
  return storage() !== null;
}

function safeRead<T>(key: string, fallback: T): T {
  const store = storage();
  if (!store) return fallback;
  try {
    const raw = store.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown): boolean {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Reports                                                                    */
/* -------------------------------------------------------------------------- */

export function loadReports(): Report[] {
  const reports = safeRead<Report[]>(KEYS.reports, []);
  if (!Array.isArray(reports)) return [];
  // Newest first, and defend against a hand-edited or partially written entry.
  return reports
    .filter((report): report is Report => Boolean(report?.id && report?.ats && report?.match))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function loadReport(id: string): Report | null {
  return loadReports().find((report) => report.id === id) ?? null;
}

/**
 * Insert or replace a report.
 *
 * Returns false when the write failed, so the UI can tell the user their
 * history is not being kept rather than silently losing it.
 */
export function saveReport(report: Report): boolean {
  const reports = loadReports().filter((existing) => existing.id !== report.id);
  reports.unshift(report);
  return safeWrite(KEYS.reports, reports.slice(0, MAX_REPORTS));
}

export function deleteReport(id: string): boolean {
  const reports = loadReports().filter((report) => report.id !== id);
  return safeWrite(KEYS.reports, reports);
}

export function updateReportStatus(id: string, status: ApplicationStatus): boolean {
  const reports = loadReports();
  const report = reports.find((candidate) => candidate.id === id);
  if (!report) return false;
  report.status = status;
  return safeWrite(KEYS.reports, reports);
}

/** The flat rows behind "My applications". */
export function loadApplications(): ApplicationRow[] {
  return loadReports().map((report) => ({
    reportId: report.id,
    jobTitle: report.jobTitle,
    company: report.company,
    atsScore: report.ats.score,
    matchScore: report.match.score,
    createdAt: report.createdAt,
    status: report.status,
    stamped: Boolean(report.stamp),
  }));
}

/* -------------------------------------------------------------------------- */
/* CV hash salt                                                               */
/* -------------------------------------------------------------------------- */

/**
 * A random salt, created once per browser and never sent anywhere.
 *
 * PRD section 5: `cvHash` is SHA-256 of (CV text + salt). Without the salt,
 * anyone holding a copy of a CV could hash it and confirm it belongs to an
 * on-chain stamp. With it, the hash proves the owner's own progress and
 * nothing about who they are.
 *
 * Losing the salt — clearing site data — means old stamps can no longer be
 * re-derived locally. That is the right trade: the alternative is storing it
 * somewhere we could read.
 */
export function getOrCreateSalt(): string {
  const existing = safeRead<string | null>(KEYS.salt, null);
  if (typeof existing === "string" && existing.length >= 32) return existing;

  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const salt = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

  safeWrite(KEYS.salt, salt);
  return salt;
}

/* -------------------------------------------------------------------------- */
/* Clear everything                                                           */
/* -------------------------------------------------------------------------- */

/**
 * The "Delete all my data" button.
 *
 * Removes every Callback key, including the salt, so nothing is left that
 * could be tied back to a stamped report.
 */
export function deleteAllData(): boolean {
  const store = storage();
  if (!store) return false;
  try {
    for (const key of Object.values(KEYS)) store.removeItem(key);
    // Sweep any key from an older schema version too.
    const stale: string[] = [];
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      if (key?.startsWith("callback.")) stale.push(key);
    }
    for (const key of stale) store.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/** Roughly how much space the stored reports take, for the privacy panel. */
export function storageFootprint(): { reports: number; bytes: number } {
  const store = storage();
  const reports = loadReports();
  if (!store) return { reports: reports.length, bytes: 0 };
  try {
    return {
      reports: reports.length,
      bytes: new Blob([store.getItem(KEYS.reports) ?? ""]).size,
    };
  } catch {
    return { reports: reports.length, bytes: 0 };
  }
}

export function hasSeenPrivacyNotice(): boolean {
  return safeRead<boolean>(KEYS.consentSeen, false) === true;
}

export function markPrivacyNoticeSeen(): void {
  safeWrite(KEYS.consentSeen, true);
}

/* -------------------------------------------------------------------------- */
/* React external store                                                      */
/* -------------------------------------------------------------------------- */

/**
 * localStorage as a subscribable store, for `useSyncExternalStore`.
 *
 * The alternative — reading storage in an effect and calling setState — is the
 * pattern React now warns about, and it has a real bug beyond the warning: it
 * cannot see a change made in another tab. This can, via the `storage` event.
 *
 * `getSnapshot` must return a referentially stable value or React re-renders
 * forever, so the snapshot is built once and cached until a write invalidates
 * it.
 */

export type ApplicationsSnapshot = {
  rows: ApplicationRow[];
  /** False when the browser is blocking local storage. */
  available: boolean;
  /** Approximate bytes used, for the privacy panel. */
  bytes: number;
};

const EMPTY_SNAPSHOT: ApplicationsSnapshot = {
  rows: [],
  available: true,
  bytes: 0,
};

let snapshot: ApplicationsSnapshot | null = null;
const listeners = new Set<() => void>();

function invalidate(): void {
  snapshot = null;
  for (const listener of listeners) listener();
}

export function subscribeToApplications(listener: () => void): () => void {
  listeners.add(listener);

  // A write from another tab fires `storage` here, which is the whole reason
  // this is a store rather than a one-shot read.
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith("callback.")) invalidate();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getApplicationsSnapshot(): ApplicationsSnapshot {
  if (snapshot) return snapshot;
  const footprint = storageFootprint();
  snapshot = {
    rows: loadApplications(),
    available: isStorageAvailable(),
    bytes: footprint.bytes,
  };
  return snapshot;
}

/** The server has no localStorage, so it renders the empty state. */
export function getApplicationsServerSnapshot(): ApplicationsSnapshot {
  return EMPTY_SNAPSHOT;
}

/* --- Mutations that notify ------------------------------------------------ */

export function saveReportAndNotify(report: Report): boolean {
  const ok = saveReport(report);
  invalidate();
  return ok;
}

export function deleteReportAndNotify(id: string): boolean {
  const ok = deleteReport(id);
  invalidate();
  return ok;
}

export function updateReportStatusAndNotify(
  id: string,
  status: ApplicationStatus,
): boolean {
  const ok = updateReportStatus(id, status);
  invalidate();
  return ok;
}

export function deleteAllDataAndNotify(): boolean {
  const ok = deleteAllData();
  invalidate();
  return ok;
}
