"use client";

import { useMemo, useState } from "react";
import { Copy, Download, Pencil, RefreshCw, Sparkles } from "lucide-react";
import { Card, Eyebrow } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { TextAreaField } from "@/components/ui/field";
import { applySuggestions, countApplied } from "@/lib/analysis/apply";
import {
  layoutCv,
  layoutText,
  layoutToText,
  type CvLayout,
  type CvLine,
} from "@/lib/analysis/cv-layout";
import { buildCvDocx, cvFilename, downloadBlob } from "@/lib/export/cv-docx";
import { LIMITS } from "@/lib/config";
import type { Report } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The Improved CV tab (PRD section 2 step 4).
 *
 * Two modes, because the two jobs conflict. Reviewing changes wants them
 * highlighted in place; editing wants a plain text box. Trying to do both at
 * once means a contenteditable with manual selection handling, which is a lot
 * of fragile code for no gain — so the tab shows the highlighted version by
 * default and swaps to a textarea when the user chooses to edit.
 *
 * Once edited by hand, the highlighting is dropped rather than guessed at:
 * claiming to show "what changed" after arbitrary edits would be a lie, and
 * the diff the user cares about by then is the one they are making themselves.
 *
 * Either way the CV is shown through `layoutCv`: one name, one contact line,
 * upper-case section headings with a divider, one bullet style. That is the
 * same structure the .docx is built from, so what you see is what downloads.
 */
export function ImprovedCvTab({
  report,
  onRecheck,
  recheckBusy,
  onTextChange,
}: {
  report: Report;
  onRecheck: (text: string) => void;
  recheckBusy: boolean;
  /** Persists hand edits back onto the report. */
  onTextChange: (text: string) => void;
}) {
  const applied = useMemo(
    () => applySuggestions(report.cvText, report.suggestions, report.decisions),
    [report.cvText, report.suggestions, report.decisions],
  );

  const layout = useMemo(() => layoutCv(applied.segments), [applied.segments]);
  const structured = useMemo(() => layoutToText(layout), [layout]);

  const acceptedCount = countApplied(report.suggestions, report.decisions);

  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  /**
   * Hand edits, or null when there are none.
   *
   * Holding the absence of an edit explicitly, rather than keeping a draft in
   * sync with `applied.text` through an effect, means accepting another
   * suggestion is picked up immediately with no effect to fire — and once the
   * user has typed, their text wins and is never silently overwritten.
   */
  const [manual, setManual] = useState<string | null>(null);

  const edited = manual !== null && manual !== structured;
  const text = manual ?? structured;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard permission can be refused; the text stays selectable.
    }
  };

  const download = async () => {
    setExporting(true);
    try {
      // Hand edits are laid out again, so they get the same structure.
      const blob = await buildCvDocx(edited ? layoutText(text) : layout, {
        name: report.jobTitle,
      });
      downloadBlob(blob, cvFilename(report.jobTitle));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* ---------- Status ---------- */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <Eyebrow className="mb-2">Improved CV</Eyebrow>
            <p className="text-[13px] leading-relaxed text-muted">
              {acceptedCount === 0
                ? "Accept some suggestions on the “What to pivot” tab and they will appear here, highlighted."
                : `${acceptedCount} change${acceptedCount === 1 ? "" : "s"} applied. Edit anything you want, then re-check to see the new scores.`}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <Button tone="outline" size="sm" onClick={() => void copy()}>
              <Copy className="size-3.5" aria-hidden="true" />
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button
              tone="outline"
              size="sm"
              onClick={() => void download()}
              disabled={exporting}
            >
              <Download className="size-3.5" aria-hidden="true" />
              {exporting ? "Building…" : ".docx"}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onTextChange(text);
                onRecheck(text);
              }}
              disabled={recheckBusy || text.trim().length < LIMITS.cvMinChars}
            >
              <RefreshCw
                className={cn("size-3.5", recheckBusy && "animate-spin motion-reduce:animate-none")}
                aria-hidden="true"
              />
              {recheckBusy ? "Re-checking…" : "Re-check"}
            </Button>
          </div>
        </div>

        {applied.unapplied.length > 0 ? (
          <p className="mt-4 rounded-[4px] bg-yellow/50 px-3 py-2.5 text-[12px] leading-relaxed text-yellow-ink">
            {applied.unapplied.length} accepted change
            {applied.unapplied.length === 1 ? "" : "s"} couldn&apos;t be placed
            automatically — the original line has probably been edited. Copy
            them across by hand from the &ldquo;What to pivot&rdquo; tab.
          </p>
        ) : null}
      </Card>

      {/* ---------- The CV ---------- */}
      <Card bare>
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <div className="flex items-center gap-2">
            {!editing && acceptedCount > 0 ? (
              <Tag tone="mint">
                <Sparkles className="size-3" aria-hidden="true" />
                Changes highlighted
              </Tag>
            ) : null}
            {edited ? <Tag tone="yellow">Edited by you</Tag> : null}
          </div>

          <Button
            tone="ghost"
            size="sm"
            onClick={() => {
              if (editing) {
                onTextChange(text);
                setEditing(false);
              } else {
                // Seed the editor with what is on screen, so the first
                // keystroke does not start from an empty box.
                setManual(text);
                setEditing(true);
              }
            }}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            {editing ? "Done editing" : "Edit"}
          </Button>
        </div>

        <div className="p-5">
          {editing ? (
            <TextAreaField
              label="Your improved CV"
              hideLabel
              value={text}
              onChange={(event) => setManual(event.target.value)}
              rows={24}
              limit={LIMITS.cvChars}
              className="font-mono"
            />
          ) : (
            <CvPreview layout={edited ? layoutText(text) : layout} />
          )}
        </div>
      </Card>

      <p className="text-[11.5px] leading-relaxed text-muted">
        The .docx export uses this same single-column layout: plain section
        dividers, real bullet lists, and no tables, images or columns — the
        format an applicant tracking system reads most reliably.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Preview                                                                    */
/* -------------------------------------------------------------------------- */

/** Mint wash on lines a suggestion changed, with the original on hover. */
function changedProps(line: Pick<CvLine, "changed" | "replaced">) {
  return {
    className: cn(line.changed && "rounded-[2px] bg-mint/45 px-1 -mx-1"),
    title: line.replaced ? `Was: ${line.replaced.trim()}` : undefined,
  };
}

/** The CV as a single-column page, mirroring the .docx. */
function CvPreview({ layout }: { layout: CvLayout }) {
  return (
    <article className="mx-auto max-w-[72ch] rounded-[6px] bg-white px-5 py-6 text-ink ring-1 ring-black/5 sm:px-9 sm:py-8">
      {layout.name ? (
        <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.01em]">
          <span {...changedProps(layout.name)}>{layout.name.text}</span>
        </h2>
      ) : null}
      {layout.contact.map((line, index) => (
        <p key={index} className="mt-1 break-words text-[12px] leading-relaxed text-muted">
          <span {...changedProps(line)}>{line.text}</span>
        </p>
      ))}

      {layout.sections.map((section, sectionIndex) => (
        <section key={sectionIndex} className="mt-6 first:mt-0">
          <h3 className="border-b border-ink/25 pb-1 text-[11.5px] font-semibold tracking-[0.12em]">
            {section.heading}
          </h3>
          <SectionBody lines={section.lines} />
        </section>
      ))}
    </article>
  );
}

/** Group consecutive bullets into one list so they render as a real <ul>. */
function SectionBody({ lines }: { lines: CvLine[] }) {
  const blocks: Array<CvLine | CvLine[]> = [];
  for (const line of lines) {
    const last = blocks[blocks.length - 1];
    if (line.kind === "bullet") {
      if (Array.isArray(last)) last.push(line);
      else blocks.push([line]);
    } else {
      blocks.push(line);
    }
  }

  return (
    <div className="mt-2.5 flex flex-col gap-1 text-[12.5px] leading-[1.65]">
      {blocks.map((block, index) =>
        Array.isArray(block) ? (
          <ul key={index} className="ml-4 list-disc space-y-1 marker:text-ink/50">
            {block.map((line, i) => (
              <li key={i} className="break-words pl-1">
                <span {...changedProps(line)}>{line.text}</span>
              </li>
            ))}
          </ul>
        ) : block.kind === "gap" ? (
          <div key={index} className="h-2" aria-hidden="true" />
        ) : (
          <p
            key={index}
            className={cn("break-words", block.kind === "entry" && "mt-1 font-semibold")}
          >
            <span {...changedProps(block)}>{block.text}</span>
          </p>
        ),
      )}
    </div>
  );
}
