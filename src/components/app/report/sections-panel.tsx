"use client";

import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Check, Eye, EyeOff, Pencil, X } from "lucide-react";
import { cleanHeading, type CvSection } from "@/lib/analysis/cv-layout";
import { cn } from "@/lib/utils";

/**
 * Reorder, rename and hide the CV's sections, as CV builders let you.
 *
 * Moving and renaming change the CV text itself; hiding keeps the section in
 * the text but leaves it out of the preview, the downloads, the copy and the
 * re-check, so it can be brought back with one click.
 */
export function SectionsPanel({
  sections,
  hidden,
  onMove,
  onRename,
  onToggleHidden,
}: {
  sections: CvSection[];
  hidden: readonly string[];
  onMove: (from: number, to: number) => void;
  onRename: (index: number, heading: string) => void;
  onToggleHidden: (heading: string) => void;
}) {
  const [renaming, setRenaming] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  if (sections.length === 0) return null;

  const save = (index: number) => {
    if (cleanHeading(draft)) onRename(index, draft);
    setRenaming(null);
  };

  return (
    <fieldset>
      <legend className="mb-2 text-[12px] font-medium text-ink">Sections</legend>
      <ol className="flex flex-col divide-y divide-line overflow-hidden rounded-[6px] ring-1 ring-line">
        {sections.map((section, index) => {
          const isHidden = hidden.includes(section.heading);
          const valid = cleanHeading(draft) !== undefined;
          return (
            <li key={`${section.heading}-${index}`} className="flex min-h-11 items-center gap-1 bg-white px-2">
              {renaming === index ? (
                <form
                  className="flex min-w-0 flex-1 items-center gap-1"
                  onSubmit={(event) => {
                    event.preventDefault();
                    save(index);
                  }}
                >
                  <label className="sr-only" htmlFor={`section-name-${index}`}>
                    New name for {section.heading}
                  </label>
                  <input
                    id={`section-name-${index}`}
                    autoFocus
                    value={draft}
                    maxLength={48}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setRenaming(null);
                    }}
                    className="h-8 min-w-0 flex-1 rounded-[4px] border border-line px-2 text-[12.5px] uppercase focus:border-espresso/50 focus:outline-none"
                  />
                  <IconButton label="Save name" type="submit" disabled={!valid}>
                    <Check className="size-3.5" aria-hidden="true" />
                  </IconButton>
                  <IconButton label="Cancel" onClick={() => setRenaming(null)}>
                    <X className="size-3.5" aria-hidden="true" />
                  </IconButton>
                </form>
              ) : (
                <>
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate px-1 text-[12.5px] font-medium tracking-wide",
                      isHidden ? "text-muted line-through" : "text-ink",
                    )}
                  >
                    {section.heading}
                  </span>
                  <IconButton
                    label={`Rename ${section.heading}`}
                    onClick={() => {
                      setDraft(section.heading);
                      setRenaming(index);
                    }}
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    label={`Move ${section.heading} up`}
                    disabled={index === 0}
                    onClick={() => onMove(index, index - 1)}
                  >
                    <ArrowUp className="size-3.5" aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    label={`Move ${section.heading} down`}
                    disabled={index === sections.length - 1}
                    onClick={() => onMove(index, index + 1)}
                  >
                    <ArrowDown className="size-3.5" aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    label={isHidden ? `Show ${section.heading}` : `Hide ${section.heading}`}
                    pressed={isHidden}
                    onClick={() => onToggleHidden(section.heading)}
                  >
                    {isHidden ? (
                      <EyeOff className="size-3.5" aria-hidden="true" />
                    ) : (
                      <Eye className="size-3.5" aria-hidden="true" />
                    )}
                  </IconButton>
                </>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-[11.5px] leading-relaxed text-muted">
        Hidden sections stay in your text but are left out of the preview, the downloads and the re-check.
      </p>
    </fieldset>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  pressed,
  type = "button",
  children,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  pressed?: boolean;
  type?: "button" | "submit";
  children: ReactNode;
}) {
  return (
    <button
      type={type}
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-[4px] text-ink transition-colors hover:bg-sand",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-espresso-btn",
        "disabled:pointer-events-none disabled:opacity-30",
      )}
    >
      {children}
    </button>
  );
}
