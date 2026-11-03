"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Download, PenLine, Pencil, Quote, RefreshCw, RotateCcw } from "lucide-react";
import { Card, Eyebrow } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { TextAreaField, TextField } from "@/components/ui/field";
import { applySuggestions } from "@/lib/analysis/apply";
import { layoutCv, layoutText, layoutToText, withoutSections } from "@/lib/analysis/cv-layout";
import { stripInline } from "@/lib/analysis/inline";
import {
  currentLetterText,
  letterFrame,
  letterParagraphs,
  letterWordCount,
} from "@/lib/analysis/cover-letter";
import { gapsFrom } from "@/lib/analysis/match";
import { ApiCallError, requestCoverLetter } from "@/lib/api/client";
import { LIMITS } from "@/lib/config";
import type { CvStyle } from "@/lib/cv-templates";
import { cvFilename, downloadBlob } from "@/lib/export/cv-docx";
import { loadCvStyle } from "@/lib/store/local";
import type {
  CoverLetter,
  CoverLetterLength,
  CoverLetterOptions,
  CoverLetterTone,
  Report,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { CvHeader, CvSheet, pt } from "./cv-page";

/**
 * The Cover letter tab.
 *
 * The letter is written from the improved CV and from the requirements the
 * analysis already matched with a quote, and every body paragraph comes back
 * with the CV lines it rests on — shown under the letter, so the user can see
 * nothing was made up. It uses the CV's template, so the two match.
 */

const TONES: Array<{ id: CoverLetterTone; label: string }> = [
  { id: "professional", label: "Professional" },
  { id: "warm", label: "Warm" },
  { id: "confident", label: "Confident" },
];

const LENGTHS: Array<{ id: CoverLetterLength; label: string }> = [
  { id: "short", label: "Short" },
  { id: "standard", label: "Standard" },
  { id: "detailed", label: "Detailed" },
];

const letterDate = (time: number) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(time);

export function CoverLetterTab({
  report,
  onChange,
}: {
  report: Report;
  onChange: (letter: CoverLetter) => void;
}) {
  // The CV the letter is written from: the user's hand edit if there is one,
  // otherwise the CV with accepted suggestions applied.
  // The report starts with `improvedCvText` equal to the original, which is
  // not a hand edit. Sections the user hid are left out here too.
  const cvText = useMemo(() => {
    const handEdited = report.improvedCvText.trim() && report.improvedCvText !== report.cvText;
    const base = handEdited
      ? report.improvedCvText
      : layoutToText(layoutCv(applySuggestions(report.cvText, report.suggestions, report.decisions).segments));
    return layoutToText(withoutSections(layoutText(base), report.hiddenSections ?? []));
  }, [report.cvText, report.improvedCvText, report.suggestions, report.decisions, report.hiddenSections]);

  const layout = useMemo(() => layoutText(cvText), [cvText]);
  const candidateName = layout.name?.text;

  // The report view only renders in the browser, so localStorage is safe here.
  const [style] = useState<CvStyle>(() => loadCvStyle());

  const letter = report.coverLetter;
  const [options, setOptions] = useState<CoverLetterOptions>(
    () => letter?.options ?? { tone: "professional", length: "standard" },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "docx" | null>(null);

  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);

  const text = letter ? currentLetterText(letter, candidateName) : "";
  const frame = letter ? letterFrame(letter, report) : { recipient: [] };
  const words = letterWordCount(editing ? draft : text);

  const write = async () => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError(null);
    setEditing(false);

    const requirementText = new Map(report.match.requirements.map((r) => [r.id, r.text]));
    const strengths = report.match.matches
      .filter((m) => m.status !== "missing" && m.evidence)
      .map((m) => ({ requirement: requirementText.get(m.requirementId) ?? "", evidence: m.evidence }))
      .filter((s) => s.requirement);

    try {
      const result = await requestCoverLetter(
        {
          ...options,
          hiringManager: options.hiringManager?.trim() || undefined,
          motivation: options.motivation?.trim() || undefined,
          cvText: stripInline(cvText).slice(0, LIMITS.cvChars),
          jobText: report.jobText.slice(0, LIMITS.jobChars),
          jobTitle: report.jobTitle,
          company: report.company,
          strengths,
          gaps: gapsFrom(report.match).map((r) => r.text),
        },
        controller.signal,
      );
      onChange({ ...result, options, createdAt: Date.now() });
    } catch (caught) {
      if (caught instanceof Error && caught.name === "AbortError") return;
      setError(
        caught instanceof ApiCallError ? caught.message : "Writing the letter failed. Please try again.",
      );
    } finally {
      if (abort.current === controller) setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard permission can be refused; the text stays selectable.
    }
  };

  const download = async (format: "pdf" | "docx") => {
    if (!letter) return;
    setExporting(format);
    try {
      const { buildCoverLetterDocx, buildCoverLetterPdf } = await import("@/lib/export/cover-letter");
      const input = {
        layout,
        text,
        style,
        date: letterDate(letter.createdAt),
        jobTitle: report.jobTitle,
        ...letterFrame(letter, report),
      };
      const blob = format === "pdf" ? await buildCoverLetterPdf(input) : await buildCoverLetterDocx(input);
      downloadBlob(blob, cvFilename(report.jobTitle, format, "cover-letter"));
    } catch {
      setError("The download couldn't be built. Try again, or use Copy.");
    } finally {
      setExporting(null);
    }
  };

  const saveEdit = () => {
    if (letter) {
      const generated = currentLetterText({ ...letter, editedText: undefined }, candidateName);
      onChange({ ...letter, editedText: draft.trim() === generated ? undefined : draft.trim() });
    }
    setEditing(false);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* ---------- Options ---------- */}
      <Card>
        <Eyebrow className="mb-2">Cover letter</Eyebrow>
        <p className="mb-5 max-w-[62ch] text-[13px] leading-relaxed text-muted">
          Written from your improved CV and the requirements you already match.
          Every paragraph is backed by a line from your CV, and nothing is said
          about the company that isn&apos;t in the job post or your own note.
        </p>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-x-8 gap-y-4">
            <Segmented
              legend="Tone"
              items={TONES}
              value={options.tone}
              onChange={(tone) => setOptions({ ...options, tone })}
            />
            <Segmented
              legend="Length"
              items={LENGTHS}
              value={options.length}
              onChange={(length) => setOptions({ ...options, length })}
            />
          </div>

          <TextField
            label="Hiring manager (optional)"
            hint="Leave empty for “Dear Hiring Manager”."
            value={options.hiringManager ?? ""}
            maxLength={LIMITS.hiringManagerChars}
            onChange={(event) => setOptions({ ...options, hiringManager: event.target.value })}
            className="max-w-[360px]"
          />

          <TextAreaField
            label="Why this company? (optional)"
            hint="In your own words, a sentence or two. It's the only thing the letter will say about the company beyond the job post."
            value={options.motivation ?? ""}
            limit={LIMITS.motivationChars}
            rows={3}
            onChange={(event) => setOptions({ ...options, motivation: event.target.value })}
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => void write()} disabled={busy}>
              {busy ? (
                <RefreshCw className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <PenLine className="size-3.5" aria-hidden="true" />
              )}
              {busy ? "Writing…" : letter ? "Write a new version" : "Write my cover letter"}
            </Button>
            {busy ? (
              <span className="text-[12px] text-muted" aria-live="polite">
                Usually 15 to 30 seconds.
              </span>
            ) : letter?.editedText && !busy ? (
              <span className="text-[12px] text-muted">A new version replaces your edits.</span>
            ) : null}
          </div>

          {error ? (
            <p role="alert" className="rounded-[4px] bg-coral/50 px-3 py-2.5 text-[12px] leading-relaxed text-coral-ink">
              {error}
            </p>
          ) : null}
        </div>
      </Card>

      {/* ---------- The letter ---------- */}
      {letter ? (
        <>
          <Card bare>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12px] tabular-nums text-muted">{words} words</span>
                {letter.editedText ? <Tag tone="yellow">Edited by you</Tag> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button tone="outline" size="sm" onClick={() => void copy()} disabled={editing}>
                  <Copy className="size-3.5" aria-hidden="true" />
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button tone="outline" size="sm" onClick={() => void download("pdf")} disabled={editing || exporting !== null}>
                  <Download className="size-3.5" aria-hidden="true" />
                  {exporting === "pdf" ? "Building…" : "PDF"}
                </Button>
                <Button tone="outline" size="sm" onClick={() => void download("docx")} disabled={editing || exporting !== null}>
                  <Download className="size-3.5" aria-hidden="true" />
                  {exporting === "docx" ? "Building…" : ".docx"}
                </Button>
                {letter.editedText && !editing ? (
                  <Button tone="ghost" size="sm" onClick={() => onChange({ ...letter, editedText: undefined })}>
                    <RotateCcw className="size-3.5" aria-hidden="true" />
                    Undo edits
                  </Button>
                ) : null}
                <Button
                  tone="ghost"
                  size="sm"
                  onClick={() => {
                    if (editing) saveEdit();
                    else {
                      setDraft(text);
                      setEditing(true);
                    }
                  }}
                >
                  <Pencil className="size-3.5" aria-hidden="true" />
                  {editing ? "Done editing" : "Edit"}
                </Button>
              </div>
            </div>

            <div className="bg-sand/60 p-3 sm:p-6">
              {editing ? (
                <TextAreaField
                  label="Your cover letter"
                  hideLabel
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={22}
                  hint="Keep a blank line between paragraphs."
                />
              ) : (
                <CvSheet style={style}>
                  {(s) => (
                    <>
                      <CvHeader s={s} name={layout.name} headline={layout.headline} lines={layout.contact} />
                      <p style={{ marginTop: pt(s.space.section), fontSize: pt(s.size.small), color: "#555555" }}>
                        {letterDate(letter.createdAt)}
                      </p>
                      <div style={{ marginTop: pt(s.space.section * 0.6) }}>
                        {frame.recipient.map((line, index) => (
                          <p key={index}>{line}</p>
                        ))}
                      </div>
                      {frame.subject ? (
                        <p style={{ marginTop: pt(s.space.section * 0.6), fontWeight: 600 }}>{frame.subject}</p>
                      ) : null}
                      <div style={{ marginTop: pt(s.space.section * 0.6) }}>
                        {letterParagraphs(text).map((paragraph, index) => (
                          <p key={index} className="whitespace-pre-line" style={{ marginTop: index === 0 ? 0 : pt(s.size.body * 0.9) }}>
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </>
                  )}
                </CvSheet>
              )}
            </div>
          </Card>

          {!letter.editedText ? <EvidenceList letter={letter} /> : null}
        </>
      ) : null}
    </div>
  );
}

/** Each body paragraph next to the CV lines it rests on. */
function EvidenceList({ letter }: { letter: CoverLetter }) {
  if (letter.body.length === 0) return null;
  return (
    <Card>
      <Eyebrow className="mb-3">Backed by your CV</Eyebrow>
      <ol className="flex flex-col gap-4">
        {letter.body.map((paragraph, index) => (
          <li key={index} className="flex flex-col gap-2">
            <p className="line-clamp-2 text-[12.5px] leading-relaxed text-ink">
              <span className="mr-1.5 tabular-nums text-muted">¶{index + 2}</span>
              {paragraph.text}
            </p>
            <ul className="flex flex-col gap-1.5">
              {paragraph.evidence.map((quote, i) => (
                <li
                  key={i}
                  className="flex gap-2 rounded-[4px] bg-mint/40 px-3 py-2 text-[12px] leading-relaxed text-mint-ink"
                >
                  <Quote className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                  <span>{quote}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function Segmented<T extends string>({
  legend,
  items,
  value,
  onChange,
}: {
  legend: string;
  items: Array<{ id: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[12.5px] font-medium text-ink">{legend}</legend>
      <div className="inline-flex flex-wrap rounded-[6px] bg-sand p-1 ring-1 ring-line">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={value === item.id}
            onClick={() => onChange(item.id)}
            className={cn(
              "min-h-9 rounded-[4px] px-3.5 text-[12.5px] transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-espresso-btn",
              value === item.id ? "bg-white font-medium text-ink shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
