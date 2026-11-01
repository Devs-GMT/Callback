"use client";

import { useMemo, useState } from "react";
import { Copy, Download, Pencil, RefreshCw, Sparkles } from "lucide-react";
import { Card, Eyebrow } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { TextAreaField } from "@/components/ui/field";
import { applySuggestions, countApplied } from "@/lib/analysis/apply";
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

  const edited = manual !== null && manual !== applied.text;
  const text = manual ?? applied.text;

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
      // Export from the segments when untouched, so headings and bullets keep
      // their structure; from the edited text otherwise.
      const segments = edited
        ? text.split("\n").map((line) => ({ text: line, changed: false }))
        : applied.segments;
      const blob = await buildCvDocx(segments, { name: report.jobTitle });
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
            <div className="overflow-x-auto">
              <pre className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-[1.75] text-ink">
                {applied.segments.map((segment, index) => (
                  <span
                    key={index}
                    className={cn(
                      segment.changed &&
                        "rounded-[2px] bg-mint/45 px-0.5 -mx-0.5",
                    )}
                    title={
                      segment.replaced
                        ? `Was: ${segment.replaced.trim()}`
                        : undefined
                    }
                  >
                    {segment.text}
                    {index < applied.segments.length - 1 ? "\n" : ""}
                  </span>
                ))}
              </pre>
            </div>
          )}
        </div>
      </Card>

      <p className="text-[11.5px] leading-relaxed text-muted">
        The .docx export uses a plain single-column layout with no tables,
        images or columns — the format an applicant tracking system reads most
        reliably.
      </p>
    </div>
  );
}
