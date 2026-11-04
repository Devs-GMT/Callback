"use client";

import { useState } from "react";
import { Check, Copy, Undo2, X } from "lucide-react";
import { Card, Eyebrow } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { isApplicable } from "@/lib/analysis/apply";
import type { Suggestion, SuggestionDecision, SuggestionKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";

/**
 * The "What to pivot" tab (PRD section 2 step 4).
 *
 * Each suggestion is a card with a before/after diff and three actions. Two
 * details carry the product's honesty promise:
 *
 *  - The job keyword a rewrite introduces is highlighted inside the new text,
 *    so the user can see exactly what changed and why it helps.
 *  - A suggestion flagged `needsUserConfirmation` is the only place a keyword
 *    the CV does not support can appear. It is visually separated, it says so
 *    in words, and accepting it never writes anything into the CV — the user
 *    decides whether it is true of them.
 */

const KIND_ORDER: SuggestionKind[] = [
  "rewrite",
  "summary",
  "moveup",
  "cut",
  "keywords",
  "gap",
];

/**
 * Wrap each job keyword found in `text` so the change is visible.
 *
 * Longest keyword first, so "data analysis" is not broken apart by a separate
 * match on "data".
 */
function highlightKeywords(text: string, keywords: string[] = []) {
  const terms = keywords
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 1)
    .sort((a, b) => b.length - a.length);

  if (terms.length === 0) return text;

  const pattern = new RegExp(
    `(${terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "gi",
  );

  return text.split(pattern).map((part, index) =>
    terms.some((term) => term.toLowerCase() === part.toLowerCase()) ? (
      <mark
        key={`${part}-${index}`}
        className="rounded-[2px] bg-lilac-soft px-0.5 text-ink"
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export function PivotTab({
  suggestions,
  decisions,
  onDecide,
  problem,
}: {
  suggestions: Suggestion[];
  decisions: Record<string, SuggestionDecision>;
  onDecide: (id: string, decision: SuggestionDecision) => void;
  /** Set when the suggestions call failed, so the tab explains itself. */
  problem?: string | null;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const p = useI18n().t.report.pivot;
  const KIND_META: Record<SuggestionKind, { label: string; blurb: string }> = p.kinds;

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied((current) => (current === id ? null : current)), 1800);
    } catch {
      // Clipboard access can be denied; the text is selectable either way.
    }
  };

  if (suggestions.length === 0) {
    return (
      <Card surface="sand" className="text-center">
        <p className="font-serif text-[18px] text-ink">{p.emptyTitle}</p>
        <p className="mx-auto mt-2 max-w-[42ch] text-[12.5px] leading-relaxed text-muted">
          {problem ?? p.emptyBody}
        </p>
      </Card>
    );
  }

  const accepted = suggestions.filter(
    (suggestion) => decisions[suggestion.id] === "accepted",
  ).length;

  const grouped = KIND_ORDER.map((kind) => ({
    kind,
    items: suggestions.filter((suggestion) => suggestion.kind === kind),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <Eyebrow className="mb-2">{p.eyebrow}</Eyebrow>
            <p className="text-[13px] leading-relaxed text-muted">
              {p.lede}
            </p>
          </div>
          <p className="shrink-0 text-[12.5px] tabular-nums text-muted">
            {fmt(p.acceptedCount, { accepted, total: suggestions.length })}
          </p>
        </div>
      </Card>

      {grouped.map((group) => (
        <section key={group.kind}>
          <Eyebrow className="mb-2.5">
            {KIND_META[group.kind].label} · {KIND_META[group.kind].blurb}
          </Eyebrow>

          <ul className="flex flex-col gap-3">
            {group.items.map((suggestion) => {
              const decision = decisions[suggestion.id] ?? "pending";
              const dismissed = decision === "dismissed";
              const isAccepted = decision === "accepted";
              const copyText = suggestion.after ?? suggestion.keywords?.join(", ") ?? suggestion.title;

              return (
                <li key={suggestion.id}>
                  <Card
                    className={cn(
                      "flex flex-col gap-3.5 transition-opacity",
                      dismissed && "opacity-55",
                      isAccepted && "border-mint-ink/30",
                      suggestion.needsUserConfirmation && "border-lilac/60 bg-lilac-soft/25",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-serif text-[16.5px] leading-snug text-ink">
                        {suggestion.title}
                      </h3>
                      {isAccepted ? (
                        <Tag tone="mint" className="shrink-0">
                          <span aria-hidden="true">✓</span>
                          {p.accepted}
                        </Tag>
                      ) : null}
                    </div>

                    {/* Before / after diff: struck-through original above the
                        new line, which reads top-to-bottom on a phone where a
                        side-by-side diff would not fit. */}
                    {suggestion.before ? (
                      <div className="rounded-[4px] border border-line">
                        <div className="border-b border-line bg-coral/20 px-3 py-2.5">
                          <p className="mb-1 text-[10.5px] font-medium uppercase tracking-[0.1em] text-coral-ink">
                            {p.before}
                          </p>
                          <p className="text-[12.5px] leading-relaxed text-ink line-through decoration-coral-ink/50">
                            {suggestion.before}
                          </p>
                        </div>

                        {suggestion.after ? (
                          <div className="bg-mint/25 px-3 py-2.5">
                            <p className="mb-1 text-[10.5px] font-medium uppercase tracking-[0.1em] text-mint-ink">
                              {p.after}
                            </p>
                            <p className="text-[12.5px] leading-relaxed text-ink">
                              {highlightKeywords(suggestion.after, suggestion.keywords)}
                            </p>
                          </div>
                        ) : (
                          <div className="bg-sand px-3 py-2.5">
                            <p className="text-[12px] italic leading-relaxed text-muted">
                              {suggestion.kind === "cut" ? p.remove : p.moveHigher}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : suggestion.after ? (
                      <div className="rounded-[4px] bg-mint/25 px-3 py-2.5">
                        <p className="mb-1 text-[10.5px] font-medium uppercase tracking-[0.1em] text-mint-ink">
                          {p.suggested}
                        </p>
                        <p className="text-[12.5px] leading-relaxed text-ink">
                          {highlightKeywords(suggestion.after, suggestion.keywords)}
                        </p>
                      </div>
                    ) : null}

                    {/* Keyword-only suggestions: the list plus the warning. */}
                    {suggestion.kind === "keywords" && suggestion.keywords?.length ? (
                      <div>
                        <ul className="flex flex-wrap gap-1.5">
                          {suggestion.keywords.map((keyword) => (
                            <li key={keyword}>
                              <Tag tone="lilac">{keyword}</Tag>
                            </li>
                          ))}
                        </ul>
                        <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted">
                          {p.keywordsNote}
                        </p>
                      </div>
                    ) : null}

                    {suggestion.rationale ? (
                      <p className="text-[12px] leading-relaxed text-muted">
                        {suggestion.rationale}
                      </p>
                    ) : null}

                    {/* ---------- Actions ---------- */}
                    <div className="flex flex-wrap items-center gap-2">
                      {isAccepted ? (
                        <Button
                          tone="outline"
                          size="sm"
                          onClick={() => onDecide(suggestion.id, "pending")}
                        >
                          <Undo2 className="size-3.5" aria-hidden="true" />
                          {p.undo}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => onDecide(suggestion.id, "accepted")}
                        >
                          <Check className="size-3.5" aria-hidden="true" />
                          {p.accept}
                        </Button>
                      )}

                      <Button
                        tone="outline"
                        size="sm"
                        onClick={() => void copy(suggestion.id, copyText)}
                      >
                        <Copy className="size-3.5" aria-hidden="true" />
                        {copied === suggestion.id ? p.copied : p.copy}
                      </Button>

                      {!dismissed ? (
                        <Button
                          tone="ghost"
                          size="sm"
                          onClick={() => onDecide(suggestion.id, "dismissed")}
                        >
                          <X className="size-3.5" aria-hidden="true" />
                          {p.dismiss}
                        </Button>
                      ) : (
                        <Button
                          tone="ghost"
                          size="sm"
                          onClick={() => onDecide(suggestion.id, "pending")}
                        >
                          <Undo2 className="size-3.5" aria-hidden="true" />
                          {p.bringBack}
                        </Button>
                      )}

                      {!isApplicable(suggestion) ? (
                        <span className="ml-auto text-[11px] text-muted">
                          {p.adviceOnly}
                        </span>
                      ) : null}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
