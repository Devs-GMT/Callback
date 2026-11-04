"use client";

import type { ReactNode } from "react";
import type { CheckState, MatchStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/client";

/**
 * The small status tags from PRD section 9.
 *
 * The reference design uses soft yellow, coral red and pink-peach chips, and
 * the PRD reuses them as the match states: green-mint for matched, soft yellow
 * for partial, coral for missing.
 *
 * Each tag carries a glyph as well as a colour. Colour alone would fail both
 * colour-blind users and anyone printing the report, and a requirements table
 * where the only difference between "you have this" and "you don't" is a hue
 * is not a table anyone should act on.
 */
export type TagTone = "mint" | "yellow" | "coral" | "lilac" | "neutral" | "stone";

const TONES: Record<TagTone, string> = {
  mint: "bg-mint text-mint-ink",
  yellow: "bg-yellow text-yellow-ink",
  coral: "bg-coral text-coral-ink",
  lilac: "bg-lilac-soft text-[#4c2a86]",
  neutral: "bg-ink/[0.06] text-muted",
  stone: "bg-stone text-[#5c4f47]",
};

export type TagProps = {
  tone?: TagTone;
  children: ReactNode;
  className?: string;
};

export function Tag({ tone = "neutral", children, className }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[4px] px-2 py-[3px]",
        "text-[11.5px] font-medium leading-tight",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */

const MATCH_PRESENTATION: Record<
  MatchStatus,
  { tone: TagTone; glyph: string }
> = {
  matched: { tone: "mint", glyph: "✓" },
  partial: { tone: "yellow", glyph: "◐" },
  missing: { tone: "coral", glyph: "✗" },
};

export function MatchTag({
  status,
  className,
}: {
  status: MatchStatus;
  className?: string;
}) {
  const { tone, glyph } = MATCH_PRESENTATION[status];
  const label = useI18n().t.app.ui.match[status];
  return (
    <Tag tone={tone} className={className}>
      <span aria-hidden="true">{glyph}</span>
      {label}
    </Tag>
  );
}

const CHECK_PRESENTATION: Record<
  CheckState,
  { tone: TagTone; glyph: string }
> = {
  pass: { tone: "mint", glyph: "✓" },
  warn: { tone: "yellow", glyph: "⚠" },
  fail: { tone: "coral", glyph: "✗" },
};

export function CheckTag({
  state,
  className,
}: {
  state: CheckState;
  className?: string;
}) {
  const { tone, glyph } = CHECK_PRESENTATION[state];
  const label = useI18n().t.app.ui.check[state];
  return (
    <Tag tone={tone} className={className}>
      <span aria-hidden="true">{glyph}</span>
      {label}
    </Tag>
  );
}

/**
 * The ✓ / ⚠ / ✗ glyph on its own, for the ATS checklist rows where the row's
 * heading already names the check.
 */
export function CheckGlyph({ state }: { state: CheckState }) {
  const { tone, glyph } = CHECK_PRESENTATION[state];
  const label = useI18n().t.app.ui.check[state];
  return (
    <span
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
        TONES[tone],
      )}
      role="img"
      aria-label={label}
    >
      <span aria-hidden="true">{glyph}</span>
    </span>
  );
}
