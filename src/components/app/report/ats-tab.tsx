"use client";

import { Card, Eyebrow } from "@/components/ui/card";
import { CheckGlyph } from "@/components/ui/tag";
import { ATS_WEIGHTS } from "@/lib/analysis/ats";
import type { AtsReport } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The ATS check tab (PRD section 2 step 4): a checklist with a ✓ / ⚠ / ✗ and
 * a fix for each item.
 *
 * Every row shows its points out of its weight. That is deliberate: the
 * product's promise is an explainable score, and "Formatting 9/15" tells a
 * user both where they lost marks and how much that check is worth, which a
 * bare traffic light does not.
 */
export function AtsTab({ report }: { report: AtsReport }) {
  const totalWeight = Object.values(ATS_WEIGHTS).reduce((sum, w) => sum + w, 0);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <Eyebrow className="mb-2">ATS check</Eyebrow>
            <p className="text-[13px] leading-relaxed text-muted">
              How well an applicant tracking system can read your CV. Scored by
              rules, not opinion — every point is accounted for below.
            </p>
          </div>
          <p className="shrink-0 font-serif text-[26px] leading-none tabular-nums text-ink">
            {report.score}
            <span className="text-[14px] text-muted">/{totalWeight}</span>
          </p>
        </div>
      </Card>

      <ul className="flex flex-col gap-3">
        {report.items.map((item) => (
          <li key={item.id}>
            <Card
              className={cn(
                "flex flex-col gap-3",
                item.state === "fail" && "border-coral-ink/25",
              )}
            >
              <div className="flex items-start gap-3">
                <CheckGlyph state={item.state} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-serif text-[16px] leading-snug text-ink">
                      {item.label}
                    </h3>
                    <span
                      className={cn(
                        "shrink-0 text-[12px] font-medium tabular-nums",
                        item.state === "pass" ? "text-mint-ink" : "text-muted",
                      )}
                    >
                      {item.earned}/{item.weight}
                    </span>
                  </div>

                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
                    {item.detail}
                  </p>
                </div>
              </div>

              {item.state !== "pass" ? (
                <div className="rounded-[4px] bg-sand px-3 py-2.5 pl-3">
                  <Eyebrow className="mb-1">The fix</Eyebrow>
                  <p className="text-[12.5px] leading-relaxed text-ink">{item.fix}</p>
                </div>
              ) : null}

              {/* A thin bar makes the lost points visible at a glance when
                  scanning the list, without adding another number to read. */}
              <div
                className="h-1 w-full overflow-hidden rounded-full bg-ink/[0.07]"
                role="img"
                aria-label={`${item.earned} of ${item.weight} points`}
              >
                <div
                  className={cn(
                    "h-full rounded-full",
                    item.state === "pass"
                      ? "bg-[#4f9c76]"
                      : item.state === "warn"
                        ? "bg-[#d9a93a]"
                        : "bg-[#cc6a53]",
                  )}
                  style={{ width: `${(item.earned / item.weight) * 100}%` }}
                />
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <p className="text-[11.5px] leading-relaxed text-muted">
        Scores are guidance, not a hiring guarantee. Different systems read CVs
        differently — these checks cover what most of them have in common.
      </p>
    </div>
  );
}
