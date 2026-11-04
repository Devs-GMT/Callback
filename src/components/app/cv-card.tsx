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
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";


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
  const { locale, t } = useI18n();
  const c = t.app.cv;
  const WARNING_LABELS: Record<ExtractionWarning, string> = c.warnings;
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
        fail(caught, c.failFile);
      } finally {
        setBusy(false);
      }
    },
    [fail, startReview, c.failFile],
  );

  const handlePaste = useCallback(() => {
    setError(null);
    try {
      startReview(extractFromPaste(pasted));
    } catch (caught) {
      fail(caught, c.failText);
    }
  }, [fail, pasted, startReview, c.failText]);

  const handleLink = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      startReview(await extractFromLink(coerceUrl(link)));
    } catch (caught) {
      fail(caught, c.failLink);
    } finally {
      setBusy(false);
    }
  }, [fail, link, startReview, c.failLink]);

  /* ------------------------------------------------------------------ */
  /* Confirmed state                                                    */
  /* ------------------------------------------------------------------ */

  if (value) {
    return (
      <Card className="flex flex-col gap-4">
        <CardHeader
          eyebrow={c.step}
          title={c.title}
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
              {c.change}
            </Button>
          }
        />

        <div className="flex items-start gap-3 rounded-[4px] bg-mint/40 p-3">
          <Check className="mt-0.5 size-4 shrink-0 text-mint-ink" aria-hidden="true" />
          <div className="min-w-0 text-[12.5px] leading-relaxed">
            <p className="font-medium text-ink">
              {value.fileName ?? c.textAdded}
            </p>
            <p className="text-muted">
              {fmt(c.characters, { count: value.text.length.toLocaleString(locale) })}
              {value.pageCount
                ? value.pageCount > 1
                  ? fmt(c.pagesMany, { count: value.pageCount })
                  : c.pagesOne
                : ""}
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
          eyebrow={c.step}
          title={c.reviewTitle}
          description={c.reviewDescription}
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
          label={c.extracted}
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
            {c.looksRight}
          </Button>
          <Button tone="outline" onClick={() => setDraft(null)}>
            {c.startOver}
          </Button>
        </div>

        {tooShort ? (
          <p className="text-[11.5px] text-coral-ink" role="alert">
            {c.tooShort}
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
        <CardHeader eyebrow={c.step} title={c.title} />
      </div>

      <Tabs
        items={[
          { id: "upload", label: c.tabs.upload },
          { id: "paste", label: c.tabs.paste },
          { id: "link", label: c.tabs.link },
        ]}
        value={tabs.value}
        onChange={tabs.setValue}
        idBase={tabs.idBase}
        label={c.howTo}
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
                  {busy ? c.reading : c.drop}
                </p>
                <p className="mt-1 text-[11.5px] text-muted">
                  {fmt(c.limits, { pages: LIMITS.pdfPages })}
                </p>
              </div>

              <Button
                tone="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
              >
                {c.choose}
              </Button>
            </div>

            <p className="mt-3 text-[11.5px] leading-relaxed text-muted">
              {c.browserNote}
            </p>
          </TabPanel>
        ) : null}

        {tabs.value === "paste" ? (
          <TabPanel id="paste" idBase={tabs.idBase}>
            <TextAreaField
              label={c.pasteLabel}
              value={pasted}
              onChange={(event) => setPasted(event.target.value)}
              placeholder={c.pastePlaceholder}
              rows={12}
              limit={LIMITS.cvChars}
            />
            <Button
              className="mt-3"
              onClick={handlePaste}
              disabled={pasted.trim().length === 0}
            >
              <FileText className="size-4" aria-hidden="true" />
              {c.useText}
            </Button>
          </TabPanel>
        ) : null}

        {tabs.value === "link" ? (
          <TabPanel id="link" idBase={tabs.idBase}>
            <TextField
              label={c.linkLabel}
              type="url"
              inputMode="url"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder="https://…"
              hint={c.linkHint}
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
              {busy ? c.readingShort : c.readLink}
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
