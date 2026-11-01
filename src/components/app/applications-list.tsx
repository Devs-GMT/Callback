"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, Trash2, TriangleAlert } from "lucide-react";
import { Card, Eyebrow } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Tag, type TagTone } from "@/components/ui/tag";
import { ChainGlyph } from "@/components/brand";
import {
  deleteAllDataAndNotify,
  deleteReportAndNotify,
  getApplicationsServerSnapshot,
  getApplicationsSnapshot,
  subscribeToApplications,
  updateReportStatusAndNotify,
} from "@/lib/store/local";
import type { ApplicationStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";

/**
 * "My applications" (PRD section 2) and the privacy controls (section 3).
 *
 * Everything here comes from localStorage, read through `useSyncExternalStore`
 * rather than in an effect. That is not just to satisfy a lint rule: the store
 * subscribes to the `storage` event, so deleting a report in another tab
 * updates this list instead of leaving it stale until a reload.
 *
 * The server snapshot is empty, because there is no localStorage on the
 * server. The prerendered HTML therefore shows the empty state and the real
 * rows appear on hydration.
 *
 * The status chip is editable inline because that is the one piece of data the
 * user owns rather than the app — nobody but them knows they got an interview.
 */

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  "not-applied": "Not applied",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  callback: "📞 Callback!",
};

const STATUS_TONES: Record<ApplicationStatus, TagTone> = {
  "not-applied": "neutral",
  applied: "stone",
  interview: "yellow",
  offer: "mint",
  callback: "lilac",
};

const STATUS_ORDER: ApplicationStatus[] = [
  "not-applied",
  "applied",
  "interview",
  "offer",
  "callback",
];

export function ApplicationsList() {
  const { rows, available, bytes } = useSyncExternalStore(
    subscribeToApplications,
    getApplicationsSnapshot,
    getApplicationsServerSnapshot,
  );
  const [confirmingWipe, setConfirmingWipe] = useState(false);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6 lg:px-10">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow className="mb-2">My applications</Eyebrow>
          <h1 className="display-3 font-serif text-ink">
            Every job you&apos;ve checked.
          </h1>
          <p className="mt-2 max-w-[54ch] text-[13.5px] leading-relaxed text-muted">
            Saved in this browser only. Update the status as you go — the last
            one is the one worth having.
          </p>
        </div>
        <ButtonLink href="/app" className="shrink-0">
          New check
        </ButtonLink>
      </header>

      {!available ? (
        <Card surface="sand" className="mb-5 flex items-start gap-3">
          <TriangleAlert
            className="mt-0.5 size-4 shrink-0 text-yellow-ink"
            aria-hidden="true"
          />
          <p className="text-[12.5px] leading-relaxed text-ink">
            This browser is blocking local storage, so your reports can&apos;t be
            saved between visits. Everything else works — download the report PDF
            before you close the tab.
          </p>
        </Card>
      ) : null}

      {rows.length === 0 ? (
        <Card surface="sand" className="py-12 text-center" role="status">
          <p className="font-serif text-[20px] text-ink">No checks yet</p>
          <p className="mx-auto mt-2 max-w-[40ch] text-[12.5px] leading-relaxed text-muted">
            Add your CV and a job, and your report will show up here with its
            scores.
          </p>
          <ButtonLink href="/app" className="mt-5">
            Check my CV
            <ArrowRight className="size-4" aria-hidden="true" />
          </ButtonLink>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.reportId}>
              {/* PRD section 8: the table becomes cards on mobile. Built as
                  cards at every width, since a row with an editable status
                  control and two scores reads better as a block. */}
              <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-serif text-[17px] leading-snug text-ink">
                      {row.jobTitle || "Untitled role"}
                    </h2>
                    {row.stamped ? (
                      <Tag tone="lilac">
                        <ChainGlyph className="text-[11px]" />
                        Stamped
                      </Tag>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[12px] text-muted">
                    {[row.company, formatDate(row.createdAt)]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>

                <dl className="flex shrink-0 items-center gap-5">
                  <div>
                    <dt className="text-[10.5px] uppercase tracking-[0.1em] text-muted">
                      ATS
                    </dt>
                    <dd className="font-serif text-[20px] tabular-nums text-ink">
                      {row.atsScore}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10.5px] uppercase tracking-[0.1em] text-muted">
                      Match
                    </dt>
                    <dd className="font-serif text-[20px] tabular-nums text-ink">
                      {row.matchScore}%
                    </dd>
                  </div>
                </dl>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <label className="sr-only" htmlFor={`status-${row.reportId}`}>
                    Status for {row.jobTitle}
                  </label>
                  <select
                    id={`status-${row.reportId}`}
                    value={row.status}
                    onChange={(event) =>
                      updateReportStatusAndNotify(
                        row.reportId,
                        event.target.value as ApplicationStatus,
                      )
                    }
                    className="min-h-11 rounded-[4px] border border-line bg-white px-2.5 text-[12.5px] text-ink md:min-h-9"
                  >
                    {STATUS_ORDER.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>

                  <Tag tone={STATUS_TONES[row.status]} className="hidden lg:inline-flex">
                    {STATUS_LABELS[row.status]}
                  </Tag>

                  <Button
                    tone="ghost"
                    size="sm"
                    aria-label={`Delete the report for ${row.jobTitle}`}
                    onClick={() => deleteReportAndNotify(row.reportId)}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {/* ---------- Privacy controls (PRD section 3) ---------- */}
      <Card surface="sand" className="mt-8 flex flex-col gap-3">
        <div>
          <Eyebrow className="mb-2">Your data</Eyebrow>
          <p className="text-[12.5px] leading-relaxed text-muted">
            {rows.length === 0
              ? "Nothing is stored in this browser."
              : `${rows.length} report${rows.length === 1 ? "" : "s"} stored in this browser, using about ${Math.max(1, Math.round(bytes / 1024))} KB. Nothing is on our servers.`}
          </p>
        </div>

        {confirmingWipe ? (
          <div className="flex flex-wrap items-center gap-3 rounded-[4px] bg-coral/30 px-3 py-3">
            <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-coral-ink">
              Delete every report and the hash salt from this browser? Stamped
              reports stay on chain, but you won&apos;t be able to re-derive
              their CV hash locally. This cannot be undone.
            </p>
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                onClick={() => {
                  deleteAllDataAndNotify();
                  setConfirmingWipe(false);
                }}
              >
                Delete everything
              </Button>
              <Button
                tone="ghost"
                size="sm"
                onClick={() => setConfirmingWipe(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            tone="outline"
            size="sm"
            className="self-start"
            onClick={() => setConfirmingWipe(true)}
            disabled={rows.length === 0}
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            Delete all my data
          </Button>
        )}

        <p className="text-[11px] leading-relaxed text-muted">
          Read more in the{" "}
          <Link
            href="/#faq"
            className="underline decoration-line underline-offset-2 hover:decoration-ink"
          >
            FAQ
          </Link>
          .
        </p>
      </Card>
    </div>
  );
}
