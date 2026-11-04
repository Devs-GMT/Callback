"use client";

import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Check, Eye, EyeOff, Info, Pencil, Plus, X } from "lucide-react";
import { cleanHeading, type CvSection } from "@/lib/analysis/cv-layout";
import { sectionKeyOf, type SectionKey } from "@/lib/analysis/text";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";

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
  onAdd,
}: {
  sections: CvSection[];
  hidden: readonly string[];
  onMove: (from: number, to: number) => void;
  onRename: (index: number, heading: string) => void;
  onToggleHidden: (heading: string) => void;
  /** Add a section; `body` is the skeleton the editor selects to type over. */
  onAdd: (heading: string, body?: string) => void;
}) {
  const [renaming, setRenaming] = useState<number | null>(null);
  const sp = useI18n().t.report.sections;
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [custom, setCustom] = useState("");

  const present = new Set(sections.map((section) => section.heading));
  // Presets in the reader's language, so an Indonesian CV gets "PROYEK"
  // rather than "PROJECTS".
  const presets = sp.presets.filter((preset) => !present.has(preset.heading));

  const save = (index: number) => {
    if (cleanHeading(draft)) onRename(index, draft);
    setRenaming(null);
  };

  return (
    <fieldset>
      <legend className="mb-2 text-[12px] font-medium text-ink">{sp.legend}</legend>
      <ol className="flex flex-col divide-y divide-line overflow-hidden rounded-[6px] ring-1 ring-line">
        {sections.map((section, index) => {
          const isHidden = hidden.includes(section.heading);
          const valid = cleanHeading(draft) !== undefined;
          return (
            <li
              key={`${section.heading}-${index}`}
              className="flex min-h-11 items-center gap-1 bg-white px-2"
            >
              {renaming === index ? (
                <form
                  className="flex min-w-0 flex-1 items-center gap-1"
                  onSubmit={(event) => {
                    event.preventDefault();
                    save(index);
                  }}
                >
                  <label className="sr-only" htmlFor={`section-name-${index}`}>
                    {fmt(sp.newName, { heading: section.heading })}
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
                    className="h-11 min-w-0 flex-1 rounded-[4px] border border-line px-2 text-[12.5px] uppercase focus:border-espresso/50 focus:outline-none md:h-8"
                  />
                  <IconButton label={sp.saveName} type="submit" disabled={!valid}>
                    <Check className="size-3.5" aria-hidden="true" />
                  </IconButton>
                  <IconButton label={sp.cancel} onClick={() => setRenaming(null)}>
                    <X className="size-3.5" aria-hidden="true" />
                  </IconButton>
                </form>
              ) : (
                <>
                  <span
                    title={section.heading}
                    className={cn(
                      "min-w-0 flex-1 truncate px-1 text-[12.5px] font-medium tracking-wide",
                      isHidden ? "text-muted line-through" : "text-ink",
                    )}
                  >
                    {section.heading}
                  </span>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <ReadAs sectionKey={sectionKeyOf(section.heading)} />
                    <IconButton
                      label={fmt(sp.rename, { heading: section.heading })}
                      onClick={() => {
                        setDraft(section.heading);
                        setRenaming(index);
                      }}
                    >
                      <Pencil className="size-3.5" aria-hidden="true" />
                    </IconButton>
                    <IconButton
                      label={fmt(sp.moveUp, { heading: section.heading })}
                      disabled={index === 0}
                      onClick={() => onMove(index, index - 1)}
                    >
                      <ArrowUp className="size-3.5" aria-hidden="true" />
                    </IconButton>
                    <IconButton
                      label={fmt(sp.moveDown, { heading: section.heading })}
                      disabled={index === sections.length - 1}
                      onClick={() => onMove(index, index + 1)}
                    >
                      <ArrowDown className="size-3.5" aria-hidden="true" />
                    </IconButton>
                    <IconButton
                      label={fmt(isHidden ? sp.show : sp.hide, { heading: section.heading })}
                      pressed={isHidden}
                      onClick={() => onToggleHidden(section.heading)}
                    >
                      {isHidden ? (
                        <EyeOff className="size-3.5" aria-hidden="true" />
                      ) : (
                        <Eye className="size-3.5" aria-hidden="true" />
                      )}
                    </IconButton>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ol>
      <div className="mt-2">
        {adding ? (
          <div className="flex flex-col gap-3 rounded-[6px] bg-sand/60 p-3 ring-1 ring-line">
            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset) => (
                <button
                  key={preset.heading}
                  type="button"
                  onClick={() => {
                    onAdd(preset.heading, preset.body);
                    setAdding(false);
                  }}
                  className="min-h-11 rounded-full bg-white px-3 text-[12px] md:min-h-9 font-medium text-ink ring-1 ring-line transition-colors hover:ring-espresso/40 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-espresso-btn"
                >
                  {preset.heading.charAt(0) + preset.heading.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <form
              className="flex items-center gap-1.5"
              onSubmit={(event) => {
                event.preventDefault();
                if (!cleanHeading(custom)) return;
                onAdd(custom, sp.placeholderBody);
                setCustom("");
                setAdding(false);
              }}
            >
              <label className="sr-only" htmlFor="custom-section">
                {sp.ownName}
              </label>
              <input
                id="custom-section"
                value={custom}
                maxLength={48}
                onChange={(event) => setCustom(event.target.value)}
                placeholder={sp.ownPlaceholder}
                className="h-11 min-w-0 flex-1 rounded-[4px] border border-line bg-white px-2.5 text-[12.5px] md:h-9 focus:border-espresso/50 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!cleanHeading(custom)}
                className="h-11 rounded-[4px] bg-espresso-btn px-3 text-[12px] font-medium text-white disabled:opacity-40 md:h-9"
              >
                {sp.add}
              </button>
              <IconButton label={sp.close} onClick={() => setAdding(false)}>
                <X className="size-3.5" aria-hidden="true" />
              </IconButton>
            </form>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-[4px] px-2 text-[12.5px] md:min-h-9 font-medium text-ink hover:bg-sand focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-espresso-btn"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            {sp.addSection}
          </button>
        )}
      </div>

      <div className="mt-3 flex gap-2.5 rounded-[6px] bg-sand/50 p-3 ring-1 ring-line/70">
        <Info className="mt-0.5 size-3.5 shrink-0 text-muted" aria-hidden="true" />
        <div className="min-w-0 text-[11.5px] leading-relaxed text-muted">
          <p className="font-medium text-ink">{sp.readAsTitle}</p>
          <p className="mt-0.5">{sp.readAsNote}</p>
          <p className="mt-1.5">{sp.readAsHidden}</p>
        </div>
      </div>
    </fieldset>
  );
}

/** How the ATS check files this heading. */
function ReadAs({ sectionKey }: { sectionKey?: SectionKey }) {
  const sp = useI18n().t.report.sections;
  const READ_AS: Record<SectionKey, string> = sp.keys;
  return (
    <span
      title={sectionKey ? fmt(sp.readAs, { section: READ_AS[sectionKey] }) : sp.extraTitle}
      className={cn(
        "hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] sm:inline",
        sectionKey ? "bg-mint/50 text-mint-ink" : "bg-sand text-muted",
      )}
    >
      {sectionKey ? READ_AS[sectionKey] : sp.extra}
    </span>
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
        "grid size-11 shrink-0 place-items-center rounded-[4px] text-ink transition-colors hover:bg-sand md:size-9",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-espresso-btn",
        "disabled:pointer-events-none disabled:opacity-30",
      )}
    >
      {children}
    </button>
  );
}
