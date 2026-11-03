"use client";

import { useMemo, useState } from "react";
import { Copy, Download, Palette, Pencil, RefreshCw, RotateCcw, Sparkles } from "lucide-react";
import { Card, Eyebrow } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { applySuggestions, countApplied } from "@/lib/analysis/apply";
import {
  layoutCv,
  layoutText,
  layoutToText,
  moveSection,
  renameSection,
  cleanHeading,
  withoutSections,
} from "@/lib/analysis/cv-layout";
import { stripInline } from "@/lib/analysis/inline";
import type { CvStyle } from "@/lib/cv-templates";
import { buildCvDocx, cvFilename, downloadBlob } from "@/lib/export/cv-docx";
import { buildCvPdf } from "@/lib/export/cv-pdf";
import { LIMITS } from "@/lib/config";
import { loadCvStyle, saveCvStyle } from "@/lib/store/local";
import type { Report } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CvEditor } from "./cv-editor";
import { CvPage } from "./cv-page";
import { SectionsPanel } from "./sections-panel";
import { TemplatePicker } from "./template-picker";

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
 * Either way the CV is shown through `layoutCv` in the chosen template. The
 * preview, the PDF and the .docx are all drawn from the same layout and the
 * same template numbers, so what you see is what downloads.
 */
export function ImprovedCvTab({
  report,
  onRecheck,
  recheckBusy,
  onTextChange,
  onHiddenChange,
}: {
  report: Report;
  onRecheck: (text: string) => void;
  recheckBusy: boolean;
  /** Persists hand edits back onto the report. */
  onTextChange: (text: string) => void;
  onHiddenChange: (headings: string[]) => void;
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
  const [exporting, setExporting] = useState<"pdf" | "docx" | null>(null);
  const [exportFailed, setExportFailed] = useState(false);
  const [showDesign, setShowDesign] = useState(true);
  // The report view only renders in the browser, so localStorage is safe here.
  const [style, setStyle] = useState<CvStyle>(() => loadCvStyle());

  const changeStyle = (next: CvStyle) => {
    setStyle(next);
    saveCvStyle(next);
  };

  /**
   * Hand edits, or null when there are none.
   *
   * Holding the absence of an edit explicitly, rather than keeping a draft in
   * sync with `applied.text` through an effect, means accepting another
   * suggestion is picked up immediately with no effect to fire — and once the
   * user has typed, their text wins and is never silently overwritten.
   */
  // A hand edit saved on the report is picked up again; the report starts
  // with `improvedCvText` equal to the original CV, which is not an edit.
  const [manual, setManual] = useState<string | null>(() =>
    report.improvedCvText && report.improvedCvText !== report.cvText ? report.improvedCvText : null,
  );

  const edited = manual !== null && manual !== structured;
  const text = manual ?? structured;
  const hidden = report.hiddenSections ?? [];

  // Hand edits are laid out again, so they get the same structure.
  const full = edited ? layoutText(text) : layout;
  const shown = withoutSections(full, hidden);
  // What leaves the page — copy, download, re-check — skips hidden sections.
  const visibleText = hidden.length > 0 ? layoutToText(shown) : text;

  /** Section edits change the text, like a hand edit. */
  const editText = (next: string) => {
    setManual(next);
    onTextChange(next);
  };

  const moveTo = (from: number, to: number) => editText(moveSection(text, from, to));

  const rename = (index: number, heading: string) => {
    const before = full.sections[index]?.heading;
    const after = cleanHeading(heading);
    if (!before || !after || before === after) return;
    editText(renameSection(text, index, heading));
    if (hidden.includes(before)) onHiddenChange(hidden.map((h) => (h === before ? after : h)));
  };

  const toggleHidden = (heading: string) =>
    onHiddenChange(hidden.includes(heading) ? hidden.filter((h) => h !== heading) : [...hidden, heading]);

  const copy = async () => {
    try {
      // Plain text for pasting into job portals: no formatting markers.
      await navigator.clipboard.writeText(stripInline(visibleText));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard permission can be refused; the text stays selectable.
    }
  };

  const download = async (format: "pdf" | "docx") => {
    setExporting(format);
    setExportFailed(false);
    try {
      const options = { title: `CV — ${report.jobTitle}` };
      const blob =
        format === "pdf"
          ? await buildCvPdf(shown, style, options)
          : await buildCvDocx(shown, style, options);
      downloadBlob(blob, cvFilename(report.jobTitle, format));
    } catch {
      setExportFailed(true);
    } finally {
      setExporting(null);
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
              onClick={() => void download("pdf")}
              disabled={exporting !== null}
            >
              <Download className="size-3.5" aria-hidden="true" />
              {exporting === "pdf" ? "Building…" : "PDF"}
            </Button>
            <Button
              tone="outline"
              size="sm"
              onClick={() => void download("docx")}
              disabled={exporting !== null}
            >
              <Download className="size-3.5" aria-hidden="true" />
              {exporting === "docx" ? "Building…" : ".docx"}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onTextChange(text);
                onRecheck(visibleText);
              }}
              disabled={recheckBusy || stripInline(visibleText).trim().length < LIMITS.cvMinChars}
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

        {exportFailed ? (
          <p role="alert" className="mt-4 rounded-[4px] bg-coral/50 px-3 py-2.5 text-[12px] leading-relaxed text-coral-ink">
            The download couldn&apos;t be built. Try again, or use Copy and paste
            the text into your own document.
          </p>
        ) : null}
      </Card>

      {/* ---------- The CV ---------- */}
      <Card bare>
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {!editing && acceptedCount > 0 ? (
              <Tag tone="mint">
                <Sparkles className="size-3" aria-hidden="true" />
                Changes highlighted
              </Tag>
            ) : null}
            {edited ? <Tag tone="yellow">Edited by you</Tag> : null}
          </div>

          <div className="flex shrink-0 flex-wrap justify-end gap-1">
            {edited && !editing ? (
              <Button
                tone="ghost"
                size="sm"
                onClick={() => {
                  setManual(null);
                  // The original CV on the report means "no hand edit".
                  onTextChange(report.cvText);
                }}
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                Undo edits
              </Button>
            ) : null}
            <Button
              tone="ghost"
              size="sm"
              aria-expanded={showDesign}
              onClick={() => setShowDesign((open) => !open)}
            >
              <Palette className="size-3.5" aria-hidden="true" />
              Design
            </Button>
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
        </div>

        {showDesign ? (
          <div className="border-b border-line px-5 py-5">
            <div className="flex flex-col gap-6">
              <TemplatePicker layout={shown} value={style} onChange={changeStyle} />
              <SectionsPanel
                sections={full.sections}
                hidden={hidden}
                onMove={moveTo}
                onRename={rename}
                onToggleHidden={toggleHidden}
              />
            </div>
          </div>
        ) : null}

        <div className="bg-sand/60 p-3 sm:p-6">
          {editing ? (
            <CvEditor value={text} onChange={setManual} />
          ) : (
            <CvPage layout={shown} style={style} />
          )}
        </div>
      </Card>

      <p className="text-[11.5px] leading-relaxed text-muted">
        Every template is a single column with standard headings, real bullet
        lists and no tables, images or text boxes — the format an applicant
        tracking system reads most reliably. Send the PDF unless a job asks
        for Word.
      </p>
    </div>
  );
}
