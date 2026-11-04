"use client";

import { useCallback, useState } from "react";
import { Check, Link2, Loader2, X } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabPanel, useTabs } from "@/components/ui/tabs";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { LIMITS } from "@/lib/config";
import {
  ExtractionError,
  coerceUrl,
  fetchJobFromUrl,
  jobFromPaste,
  looksLikeUrl,
} from "@/lib/extract";
import type { JobInput, Seniority } from "@/lib/types";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";


/**
 * Step 2 of PRD section 2: paste the job description, or give its URL.
 *
 * The URL path works on the ATS platforms the PRD names — Greenhouse, Lever,
 * Workable and Ashby all publish schema.org JobPosting data, which is what the
 * server reads. LinkedIn and some job boards block reading entirely, so when
 * that happens the error says so and points at the paste tab rather than
 * failing vaguely.
 *
 * Title, company and seniority stay optional, and get filled in from the page
 * when it offers them, because asking for them up front is friction on a step
 * that is already a copy-paste.
 */

type JobTab = "paste" | "url";

const SENIORITY_VALUES: Seniority[] = ["unknown", "intern", "junior", "mid", "senior", "lead"];

export function JobCard({
  value,
  onChange,
  onClear,
}: {
  value: JobInput | null;
  onChange: (job: JobInput) => void;
  onClear: () => void;
}) {
  const { locale, t } = useI18n();
  const j = t.app.job;
  const SENIORITY_OPTIONS = SENIORITY_VALUES.map((value) => ({ value, label: j.seniority[value] }));
  const tabs = useTabs<JobTab>("paste");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [seniority, setSeniority] = useState<Seniority>("unknown");

  const fail = useCallback((caught: unknown, fallback: string) => {
    if (caught instanceof ExtractionError) {
      setError(caught.userMessage);
      if (caught.suggestPaste) tabs.setValue("paste");
    } else {
      setError(fallback);
    }
  }, [tabs]);

  const submitPaste = useCallback(() => {
    setError(null);
    try {
      const job = jobFromPaste(text, { title, company });
      onChange({
        ...job,
        seniority: seniority === "unknown" ? job.seniority : seniority,
      });
    } catch (caught) {
      fail(caught, j.failText);
    }
  }, [company, fail, onChange, seniority, text, title, j.failText]);

  const submitUrl = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const job = await fetchJobFromUrl(coerceUrl(url));
      // Prefill the paste tab too, so a user who wants to tweak the text can
      // switch across without losing what we fetched.
      setText(job.text);
      setTitle(job.title ?? "");
      setCompany(job.company ?? "");
      onChange({
        ...job,
        seniority: seniority === "unknown" ? job.seniority : seniority,
      });
    } catch (caught) {
      fail(caught, j.failLink);
    } finally {
      setBusy(false);
    }
  }, [fail, onChange, seniority, url, j.failLink]);

  /* ------------------------------------------------------------------ */

  if (value) {
    return (
      <Card className="flex flex-col gap-4">
        <CardHeader
          eyebrow={j.step}
          title={j.title}
          trailing={
            <Button
              tone="ghost"
              size="sm"
              onClick={() => {
                onClear();
                setError(null);
              }}
            >
              <X className="size-3.5" aria-hidden="true" />
              {j.change}
            </Button>
          }
        />

        <div className="flex items-start gap-3 rounded-[4px] bg-mint/40 p-3">
          <Check className="mt-0.5 size-4 shrink-0 text-mint-ink" aria-hidden="true" />
          <div className="min-w-0 text-[12.5px] leading-relaxed">
            <p className="font-medium text-ink">
              {value.title || j.added}
              {value.company ? ` · ${value.company}` : ""}
            </p>
            <p className="text-muted">
              {fmt(j.characters, { count: value.text.length.toLocaleString(locale) })}
              {value.source === "url" ? j.fromPage : ""}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card bare className="flex flex-col">
      <div className="p-5 pb-0">
        <CardHeader eyebrow={j.step} title={j.title} />
      </div>

      <Tabs
        items={[
          { id: "paste", label: j.tabs.paste },
          { id: "url", label: j.tabs.url },
        ]}
        value={tabs.value}
        onChange={tabs.setValue}
        idBase={tabs.idBase}
        label={j.howTo}
        className="mt-4 px-5"
      />

      <div className="p-5">
        {tabs.value === "paste" ? (
          <TabPanel id="paste" idBase={tabs.idBase}>
            <TextAreaField
              label={j.descriptionLabel}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={j.descriptionPlaceholder}
              rows={10}
              limit={LIMITS.jobChars}
            />
          </TabPanel>
        ) : null}

        {tabs.value === "url" ? (
          <TabPanel id="url" idBase={tabs.idBase}>
            <TextField
              label={j.urlLabel}
              type="url"
              inputMode="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://jobs.example.com/…"
              hint={j.urlHint}
              onKeyDown={(event) => {
                if (event.key === "Enter" && looksLikeUrl(url)) {
                  event.preventDefault();
                  void submitUrl();
                }
              }}
            />
            <Button
              className="mt-3"
              onClick={() => void submitUrl()}
              disabled={busy || !looksLikeUrl(url)}
            >
              {busy ? (
                <Loader2
                  className="size-4 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <Link2 className="size-4" aria-hidden="true" />
              )}
              {busy ? j.readingShort : j.readJob}
            </Button>
          </TabPanel>
        ) : null}

        {/* Optional details, shared by both tabs. */}
        <details className="group mt-4 border-t border-line pt-4">
          <summary className="flex min-h-11 cursor-pointer list-none items-center text-[12.5px] font-medium text-muted transition-colors hover:text-ink md:min-h-0">
            {j.details}
            <span className="ml-2 text-[11px] font-normal text-muted">
              {j.optional}
            </span>
          </summary>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <TextField
              label={j.titleLabel}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={j.titlePlaceholder}
              maxLength={LIMITS.jobTitleChars}
              hint={fmt(j.titleHint, { limit: LIMITS.jobTitleChars })}
            />
            <TextField
              label={j.companyLabel}
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              placeholder={j.companyPlaceholder}
            />
            <SelectField
              label={j.seniorityLabel}
              value={seniority}
              onChange={(event) => setSeniority(event.target.value as Seniority)}
              options={SENIORITY_OPTIONS}
              className="sm:col-span-2"
            />
          </div>
        </details>

        {tabs.value === "paste" ? (
          <Button
            className="mt-4"
            onClick={submitPaste}
            disabled={text.trim().length === 0}
          >
            {j.useJob}
          </Button>
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
