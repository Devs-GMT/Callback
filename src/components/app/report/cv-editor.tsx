"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Bold, Heading, Italic, Link2, List } from "lucide-react";
import { toggleHeading } from "@/lib/analysis/cv-layout";
import { insertLink, safeHref, toggleBullets, toggleMarker } from "@/lib/analysis/inline";
import { LIMITS } from "@/lib/config";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/client";

/**
 * The Improved CV's text editor with a formatting toolbar.
 *
 * Formatting is written into the text as light markers (see `inline.ts`), so
 * the CV stays plain text for the ATS check and the re-check. Each command
 * replaces only the changed part of the text through `insertText`, which
 * keeps the browser's own undo (Ctrl+Z) working; where that is unavailable
 * the value is set directly.
 */
export function CvEditor({
  value,
  onChange,
  initialSelection,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Text to select when the editor opens, such as a new section's skeleton. */
  initialSelection?: { start: number; end: number } | null;
}) {
  const area = useRef<HTMLTextAreaElement>(null);
  const { locale, t } = useI18n();
  const ed = t.report.editor;
  const [linking, setLinking] = useState<{ start: number; end: number } | null>(null);
  const [url, setUrl] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const el = area.current;
    if (!el || !initialSelection) return;
    el.focus();
    el.setSelectionRange(initialSelection.start, initialSelection.end);
    // Bring the selection into view: scroll to the line it starts on.
    const line = el.value.slice(0, initialSelection.start).split("\n").length;
    const lineHeight = Number.parseFloat(getComputedStyle(el).lineHeight) || 20;
    el.scrollTop = Math.max(0, (line - 3) * lineHeight);
  }, [initialSelection]);

  /** Put `next` in the box, changing only what differs, then select a range. */
  const apply = (next: { value: string; start: number; end: number }) => {
    const el = area.current;
    if (!el) return;
    const old = el.value;
    let from = 0;
    while (from < old.length && from < next.value.length && old[from] === next.value[from]) from += 1;
    let tail = 0;
    while (
      tail < old.length - from &&
      tail < next.value.length - from &&
      old[old.length - 1 - tail] === next.value[next.value.length - 1 - tail]
    ) {
      tail += 1;
    }
    el.focus();
    el.setSelectionRange(from, old.length - tail);
    const inserted = next.value.slice(from, next.value.length - tail);
    // Deprecated but still the only way to edit a textarea with undo intact.
    const done = document.execCommand?.("insertText", false, inserted);
    if (!done || el.value !== next.value) onChange(next.value);
    requestAnimationFrame(() => el.setSelectionRange(next.start, next.end));
  };

  const selection = () => {
    const el = area.current;
    return el ? { value: el.value, start: el.selectionStart, end: el.selectionEnd } : null;
  };

  const mark = (marker: "**" | "*") => {
    const s = selection();
    if (s) apply(toggleMarker(s.value, s.start, s.end, marker));
  };

  const bullets = () => {
    const s = selection();
    if (s) apply(toggleBullets(s.value, s.start, s.end));
  };

  const heading = () => {
    const s = selection();
    if (!s) return;
    const next = toggleHeading(s.value, s.start);
    if (next) {
      setNotice(null);
      apply(next);
    } else {
      setNotice(ed.headingNotice);
    }
  };

  const startLink = () => {
    const s = selection();
    if (!s) return;
    const selected = s.value.slice(s.start, s.end).trim();
    setUrl(safeHref(selected) ? selected : "");
    setLinking({ start: s.start, end: s.end });
  };

  const finishLink = () => {
    const href = safeHref(url);
    const el = area.current;
    if (linking && href && el) {
      apply(insertLink(el.value, linking.start, linking.end, url.trim()));
    }
    setLinking(null);
    setUrl("");
  };

  const shortcuts = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === "b") mark("**");
    else if (key === "i") mark("*");
    else if (key === "k") startLink();
    else return;
    event.preventDefault();
  };

  const over = value.length > LIMITS.cvChars;

  return (
    <div className="flex flex-col gap-2">
      <div
        role="toolbar"
        aria-label={ed.toolbar}
        className="flex flex-wrap items-center gap-1 rounded-[6px] bg-white p-1 ring-1 ring-line"
      >
        <ToolButton label={ed.bold} onClick={() => mark("**")}>
          <Bold className="size-3.5" aria-hidden="true" />
        </ToolButton>
        <ToolButton label={ed.italic} onClick={() => mark("*")}>
          <Italic className="size-3.5" aria-hidden="true" />
        </ToolButton>
        <ToolButton label={ed.link} onClick={startLink} pressed={linking !== null}>
          <Link2 className="size-3.5" aria-hidden="true" />
        </ToolButton>
        <ToolButton label={ed.bullets} onClick={bullets}>
          <List className="size-3.5" aria-hidden="true" />
        </ToolButton>
        <ToolButton label={ed.heading} onClick={heading}>
          <Heading className="size-3.5" aria-hidden="true" />
        </ToolButton>

        {linking ? (
          <form
            className="flex min-w-0 flex-1 items-center gap-1.5 pl-1"
            onSubmit={(event) => {
              event.preventDefault();
              finishLink();
            }}
          >
            <label className="sr-only" htmlFor="cv-link-url">
              {ed.linkAddress}
            </label>
            <input
              id="cv-link-url"
              autoFocus
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setLinking(null);
                  area.current?.focus();
                }
              }}
              placeholder="https://github.com/you"
              className="h-11 min-w-0 flex-1 rounded-[4px] border border-line px-2 text-[12.5px] focus:border-espresso/50 focus:outline-none md:h-8"
            />
            <button
              type="submit"
              disabled={!safeHref(url)}
              className="h-11 rounded-[4px] bg-espresso-btn px-3 text-[12px] font-medium text-white disabled:opacity-40 md:h-8"
            >
              {ed.addLink}
            </button>
          </form>
        ) : (
          <span className="ml-auto hidden px-2 text-[11.5px] text-muted sm:inline">
            {ed.selectHint}
          </span>
        )}
      </div>

      {notice ? (
        <p role="status" className="rounded-[4px] bg-yellow/50 px-3 py-2 text-[12px] text-yellow-ink">
          {notice}
        </p>
      ) : null}

      <label className="sr-only" htmlFor="cv-editor">
        {ed.label}
      </label>
      <textarea
        id="cv-editor"
        ref={area}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={shortcuts}
        rows={24}
        spellCheck
        aria-invalid={over || undefined}
        className={cn(
          "w-full resize-y rounded-[4px] border bg-white px-3 py-2.5 font-mono text-[13px] leading-relaxed text-ink",
          "focus:border-espresso/50 focus:outline-none",
          over ? "border-coral-ink/50" : "border-line",
        )}
      />
      <p className="flex flex-wrap justify-between gap-2 text-[11.5px] text-muted">
        <span>
          <code>**bold**</code> · <code>*italic*</code> · <code>[text](link)</code> · {ed.syntaxBullet}{" "}
          <code>•</code> {ed.syntaxRest}
        </span>
        <span className={over ? "text-coral-ink" : undefined}>
          {value.length.toLocaleString(locale)} / {LIMITS.cvChars.toLocaleString(locale)}
        </span>
      </p>
    </div>
  );
}

function ToolButton({
  label,
  onClick,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  pressed?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      // Keep the textarea's selection: a click would otherwise blur it first.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "grid size-11 place-items-center rounded-[4px] text-ink transition-colors hover:bg-sand md:size-9",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-espresso-btn",
        pressed && "bg-sand",
      )}
    >
      {children}
    </button>
  );
}
