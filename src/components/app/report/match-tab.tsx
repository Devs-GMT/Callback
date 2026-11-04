"use client";

import { Quote } from "lucide-react";
import { Card, Eyebrow } from "@/components/ui/card";
import { MatchTag, Tag } from "@/components/ui/tag";
import { MATCH_WEIGHTS } from "@/lib/analysis/match";
import type { MatchReport, MatchStatus, RequirementCategory } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";

/**
 * The Job match tab (PRD section 2 step 4).
 *
 * The requirements list is the centre of the report, and the evidence quote is
 * what makes it trustworthy: each matched requirement shows the exact words
 * from the user's own CV that earned it. A score with no evidence is just an
 * assertion, and `buildMatchReport` already demotes any claim whose quote it
 * cannot find in the CV — so what is rendered here has been verified.
 *
 * Rendered as a list of rows rather than a `<table>`. PRD section 8 turns the
 * table into cards on mobile, and a three-cell row whose middle cell is a
 * multi-line blockquote reads better as a stacked block at every width than as
 * a table that has to be rebuilt below 768px.
 */

const STATUS_ORDER: Record<MatchStatus, number> = {
  missing: 0,
  partial: 1,
  matched: 2,
};

export function MatchTab({ report }: { report: MatchReport }) {
  const byId = new Map(report.matches.map((match) => [match.requirementId, match]));
  const m = useI18n().t.report.match;
  const CATEGORY_LABELS: Record<RequirementCategory, string> = m.categories;

  // Must-haves first, and inside each group the gaps first, because the gaps
  // are the actionable part and should not be buried under what already works.
  const ordered = [...report.requirements].sort((a, b) => {
    if (a.type !== b.type) return a.type === "must" ? -1 : 1;
    const sa = byId.get(a.id)?.status ?? "missing";
    const sb = byId.get(b.id)?.status ?? "missing";
    return STATUS_ORDER[sa] - STATUS_ORDER[sb];
  });

  const musts = ordered.filter((requirement) => requirement.type === "must");
  const nices = ordered.filter((requirement) => requirement.type === "nice");

  return (
    <div className="flex flex-col gap-5">
      {/* ---------- How the score is made up ---------- */}
      <Card>
        <Eyebrow className="mb-2">{m.howTitle}</Eyebrow>
        <p className="text-[13px] leading-relaxed text-muted">
          {fmt(m.how, {
            must: MATCH_WEIGHTS.must,
            nice: MATCH_WEIGHTS.nice,
            keywords: MATCH_WEIGHTS.keywords,
          })}
        </p>

        {report.seniority.note ? (
          <p
            className={cn(
              "mt-4 rounded-[4px] px-3 py-2.5 text-[12px] leading-relaxed",
              report.seniority.mismatch
                ? "bg-yellow/50 text-yellow-ink"
                : "bg-sand text-muted",
            )}
          >
            <span className="font-medium">{m.seniority}</span>
            {report.seniority.note}
          </p>
        ) : null}
      </Card>

      {/* ---------- Requirements ---------- */}
      {[
        { label: m.musts, items: musts },
        { label: m.nices, items: nices },
      ].map((group) =>
        group.items.length === 0 ? null : (
          <section key={group.label}>
            <Eyebrow className="mb-2.5">
              {group.label} · {group.items.length}
            </Eyebrow>

            <ul className="flex flex-col gap-2.5">
              {group.items.map((requirement) => {
                const match = byId.get(requirement.id);
                const status = match?.status ?? "missing";

                return (
                  <li key={requirement.id}>
                    <Card
                      className={cn(
                        "flex flex-col gap-3",
                        status === "missing" &&
                          requirement.type === "must" &&
                          "border-coral-ink/25",
                      )}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 basis-[16rem]">
                          <p className="text-[13.5px] leading-snug text-ink">
                            {requirement.text}
                          </p>
                          <Tag tone="neutral" className="mt-2">
                            {CATEGORY_LABELS[requirement.category]}
                          </Tag>
                        </div>
                        <MatchTag status={status} className="shrink-0" />
                      </div>

                      {match?.evidence ? (
                        <blockquote className="flex items-start gap-2.5 rounded-[4px] bg-sand px-3 py-2.5">
                          <Quote
                            className="mt-0.5 size-3.5 shrink-0 rotate-180 text-muted"
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <p className="text-[12.5px] italic leading-relaxed text-ink">
                              {match.evidence}
                            </p>
                            <footer className="mt-1 text-[11px] text-muted">
                              {m.fromCv}
                            </footer>
                          </div>
                        </blockquote>
                      ) : null}

                      {match?.note ? (
                        <p className="text-[12px] leading-relaxed text-muted">
                          {match.note}
                        </p>
                      ) : null}
                    </Card>
                  </li>
                );
              })}
            </ul>
          </section>
        ),
      )}

      {/* ---------- Keyword coverage ---------- */}
      <section>
        <Eyebrow className="mb-2.5">
          {m.keywords} ·{" "}
          {Math.round(report.keywords.ratio * 100)}%
        </Eyebrow>

        <Card className="flex flex-col gap-4">
          <p className="text-[12.5px] leading-relaxed text-muted">
            {m.keywordsLede}
          </p>

          {report.keywords.matched.length > 0 ? (
            <div>
              <p className="mb-2 text-[12px] font-medium text-ink">
                {m.inCv} · {report.keywords.matched.length}
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {report.keywords.matched.map((keyword) => (
                  <li key={keyword}>
                    <Tag tone="mint">
                      <span aria-hidden="true">✓</span>
                      {keyword}
                    </Tag>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {report.keywords.missing.length > 0 ? (
            <div>
              <p className="mb-2 text-[12px] font-medium text-ink">
                {m.missing} · {report.keywords.missing.length}
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {report.keywords.missing.map((keyword) => (
                  <li key={keyword}>
                    <Tag tone="coral">
                      <span aria-hidden="true">✗</span>
                      {keyword}
                    </Tag>
                  </li>
                ))}
              </ul>
              <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted">
                {m.onlyIfTrue}
              </p>
            </div>
          ) : null}
        </Card>
      </section>
    </div>
  );
}
