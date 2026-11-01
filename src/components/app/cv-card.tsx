"use client";

import { useCallback, useRef, useState } from "react";
import { Check, FileText, Link2, Loader2, Upload, X } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabPanel, useTabs } from "@/components/ui/tabs";
import { TextAreaField, TextField } from "@/components/ui/field";
import { Tag } from "@/components/ui/tag";
import { LIMITS } from "@/lib/config";
import {
  ACCEPTED_FILE_TYPES,
  ExtractionError,
  coerceUrl,
  extractFromFile,
  extractFromLink,
  extractFromPaste,
  looksLikeUrl,
} from "@/lib/extract";
import type { CvInput, ExtractionWarning } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Step 1 of PRD section 2: the three ways to add a CV, plus the preview.
 *
 * The preview with its "Looks right" confirmation is the part that earns its
 * keep. Extraction from a PDF is never perfect, and the whole report is
 * computed from this text — so the user gets to see exactly what we read, and
 * correct it, before anything is scored. Without that step a column-mangled
 * CV would quietly produce a wrong report and the user would have no way to
 * tell why.
 */

type CvTab = "upload" | "paste" | "link";

const WARNING_LABELS: Record<ExtractionWarning, string> = {
  "two-columns": "Two-column layout",
  "sparse-text": "Very little text found",
  tables: "Tables found",
  images: "Images found",
  "header-footer": "Details in a header or footer",
};

export function CvCard({
  value,
  onChange,
  onClear,
}: {
  value: CvInput | null;
  onChange: (cv: CvInput) => void;
  onClear: () => void;
}) {
  const tabs = useTabs<CvTab>("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const [pasted, setPasted] = useState("");
  const [link, setLink] = useState("");

  /** Text being reviewed in the preview, before the user confirms it. */
  const [draft, setDraft] = useState<CvInput | null>(null);
  const [editedText, setEditedText] = useState("");

  const fail = useCallback((caught: unknown, fallback: string) => {
    if (caught instanceof ExtractionError) {
      setError(caught.userMessage);
      if (caught.suggestPaste) tabs.setValue("paste");
    } else {
      setError(fallback);
    }
  }, [tabs]);

  const startReview = useCallback((cv: CvInput) => {
    setDraft(cv);
    setEditedText(cv.text);
    setError(null);
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setBusy(true);
      setError(null);
      try {
        startReview(await extractFromFile(file));
      } catch (caught) {
        fail(caught, "We couldn't read that file.");
      } finally {
        setBusy(false);
      }
    },
    [fail, startReview],
  );

  const handlePaste = useCallback(() => {
    setError(null);
    try {
      startReview(extractFromPaste(pasted));
    } catch (caught) {
      fail(caught, "We couldn't read that text.");
    }
  }, [fail, pasted, startReview]);

  const handleLink = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      startReview(await extractFromLink(coerceUrl(link)));
    } catch (caught) {
      fail(caught, "We couldn't read that link.");
    } finally {
      setBusy(false);
    }
  }, [fail, link, startReview]);

  /* ------------------------------------------------------------------ */
  /* Confirmed state                                                    */
  /* ------------------------------------------------------------------ */

  if (value) {
    return (
      <Card className="flex flex-col gap-4">
        <CardHeader
          eyebrow="Step 1"
          title="Your CV"
          trailing={
            <Button
              tone="ghost"
              size="sm"
              onClick={() => {
                onClear();
                setDraft(null);
                setPasted("");
                setLink("");
              }}
            >
              <X className="size-3.5" aria-hidden="true" />
              Change
            </Button>
          }
        />

        <div className="flex items-start gap-3 rounded-[4px] bg-mint/40 p-3">
          <Check className="mt-0.5 size-4 shrink-0 text-mint-ink" aria-hidden="true" />
          <div className="min-w-0 text-[12.5px] leading-relaxed">
            <p className="font-medium text-ink">
              {value.fileName ?? "CV text added"}
            </p>
            <p className="text-muted">
              {value.text.length.toLocaleString("en")} characters
              {value.pageCount ? ` · ${value.pageCount} page${value.pageCount > 1 ? "s" : ""}` : ""}
            </p>
          </div>
        </div>

        {value.warnings.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {value.warnings.map((warning) => (
              <Tag key={warning} tone="yellow">
                ⚠ {WARNING_LABELS[warning]}
              </Tag>
            ))}
          </div>
        ) : null}
      </Card>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Preview and confirm                                                */
  /* ------------------------------------------------------------------ */

  if (draft) {
    const tooShort = editedText.replace(/\s/g, "").length < LIMITS.cvMinChars;

    return (
      <Card className="flex flex-col gap-4">
        <CardHeader
          eyebrow="Step 1"
          title="Does this look right?"
          description="This is the text we read. Fix anything that came out wrong — the whole report is based on it."
        />

        {draft.warnings.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {draft.warnings.map((warning) => (
              <Tag key={warning} tone="yellow">
                ⚠ {WARNING_LABELS[warning]}
              </Tag>
            ))}
          </div>
        ) : null}

        <TextAreaField
          label="Extracted CV text"
          hideLabel
          value={editedText}
          onChange={(event) => setEditedText(event.target.value)}
          rows={14}
          limit={LIMITS.cvChars}
          className="font-mono"
        />

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              onChange({ ...draft, text: editedText.trim() });
              setDraft(null);
            }}
            disabled={tooShort || editedText.length > LIMITS.cvChars}
          >
            <Check className="size-4" aria-hidden="true" />
            Looks right
          </Button>
          <Button tone="outline" onClick={() => setDraft(null)}>
            Start over
          </Button>
        </div>

        {tooShort ? (
          <p className="text-[11.5px] text-coral-ink" role="alert">
            That is too short to score as a CV.
          </p>
        ) : null}
      </Card>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Input                                                              */
  /* ------------------------------------------------------------------ */

  return (
    <Card bare className="flex flex-col">
      <div className="p-5 pb-0">
        <CardHeader eyebrow="Step 1" title="Your CV" />
      </div>

      <Tabs
        items={[
          { id: "upload", label: "Upload" },
          { id: "paste", label: "Paste text" },
          { id: "link", label: "Link" },
        ]}
        value={tabs.value}
        onChange={tabs.setValue}
        idBase={tabs.idBase}
        label="How to add your CV"
        className="mt-4 px-5"
      />

      <div className="p-5">
        {tabs.value === "upload" ? (
          <TabPanel id="upload" idBase={tabs.idBase}>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                // Reset so picking the same file twice still fires a change.
                event.target.value = "";
                if (file) void handleFile(file);
              }}
            />

            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                const file = event.dataTransfer.files?.[0];
                if (file) void handleFile(file);
              }}
              className={cn(
                "paper-dots group relative flex flex-col items-center gap-3 overflow-hidden rounded-[14px] border-2 border-dashed px-4 py-10 text-center transition-all duration-300",
                dragging
                  ? "scale-[1.015] border-lilac bg-lilac-soft/60"
                  : "border-line bg-sand/60 hover:border-ink/25",
              )}
            >
              <span
                className={cn(
                  "relative flex size-14 items-center justify-center rounded-[14px] bg-white shadow-[0_14px_30px_-16px_rgba(28,16,9,0.45)] ring-1 ring-line transition-transform duration-500",
                  dragging ? "-translate-y-1 rotate-[-6deg] scale-110" : "animate-float-slow",
                )}
              >
                {busy ? (
                  <Loader2
                    className="size-5 animate-spin text-ink motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                ) : (
                  <Upload className="size-5 text-ink" aria-hidden="true" />
                )}
                <span className="absolute -right-1.5 -top-1.5 rounded-[4px] bg-lilac px-1 py-px text-[9px] font-semibold text-espresso">
                  PDF
                </span>
              </span>

              <div>
                <p className="text-[13px] font-medium text-ink">
                  {busy ? "Reading your CV…" : "Drop your CV here"}
                </p>
                <p className="mt-1 text-[11.5px] text-muted">
                  PDF or Word (.docx) · up to 5 MB · up to {LIMITS.pdfPages} pages
                </p>
              </div>

              <Button
                tone="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
              >
                Choose a file
              </Button>
            </div>

            <p className="mt-3 text-[11.5px] leading-relaxed text-muted">
              Read in your browser. Your CV is only sent to our server for the AI
              check, and is never stored.
            </p>
          </TabPanel>
        ) : null}

        {tabs.value === "paste" ? (
          <TabPanel id="paste" idBase={tabs.idBase}>
            <TextAreaField
              label="Paste your CV"
              value={pasted}
              onChange={(event) => setPasted(event.target.value)}
              placeholder="Paste the whole thing — summary, experience, education and skills."
              rows={12}
              limit={LIMITS.cvChars}
            />
            <Button
              className="mt-3"
              onClick={handlePaste}
              disabled={pasted.trim().length === 0}
            >
              <FileText className="size-4" aria-hidden="true" />
              Use this text
            </Button>
          </TabPanel>
        ) : null}

        {tabs.value === "link" ? (
          <TabPanel id="link" idBase={tabs.idBase}>
            <TextField
              label="Link to your CV"
              type="url"
              inputMode="url"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder="https://…"
              hint="A Google Doc published to the web, a public Notion page, or your own site. Pages that need a login can't be read."
              onKeyDown={(event) => {
                if (event.key === "Enter" && looksLikeUrl(link)) {
                  event.preventDefault();
                  void handleLink();
                }
              }}
            />
            <Button
              className="mt-3"
              onClick={() => void handleLink()}
              disabled={busy || !looksLikeUrl(link)}
            >
              {busy ? (
                <Loader2
                  className="size-4 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <Link2 className="size-4" aria-hidden="true" />
              )}
              {busy ? "Reading…" : "Read this link"}
            </Button>
          </TabPanel>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-[4px] bg-coral/35 px-3 py-2.5 text-[12px] leading-relaxed text-coral-ink"
          >
            {error}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
