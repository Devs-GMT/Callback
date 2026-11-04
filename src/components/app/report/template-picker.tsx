"use client";

import { Check } from "lucide-react";
import type { CvLayout } from "@/lib/analysis/cv-layout";
import {
  CV_ACCENTS,
  CV_ACCENT_ORDER,
  CV_TEMPLATES,
  CV_TEMPLATE_ORDER,
  type CvStyle,
} from "@/lib/cv-templates";
import { cn } from "@/lib/utils";
import { CvPage } from "./cv-page";
import { useI18n } from "@/i18n/client";

/**
 * Template, accent and density controls.
 *
 * Each template card is a live miniature of the user's own CV, not a stock
 * picture, so choosing is comparing real results.
 */
export function TemplatePicker({
  layout,
  value,
  onChange,
}: {
  layout: CvLayout;
  value: CvStyle;
  onChange: (style: CvStyle) => void;
}) {
  const tp = useI18n().t.report.templates;
  return (
    <div className="flex flex-col gap-5">
      <fieldset>
        <legend className="mb-2.5 text-[12px] font-medium text-ink">{tp.template}</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CV_TEMPLATE_ORDER.map((id) => {
            const template = CV_TEMPLATES[id];
            const selected = value.template === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange({ ...value, template: id })}
                className={cn(
                  "group flex min-h-11 flex-col gap-2 rounded-[6px] p-1.5 text-left transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-espresso-btn",
                  selected ? "bg-sand ring-2 ring-espresso-btn" : "ring-1 ring-line hover:bg-sand",
                )}
              >
                {/* The top of the first page, at thumbnail size. */}
                <div className="pointer-events-none relative aspect-[1/0.9] overflow-hidden rounded-[3px]" aria-hidden="true" inert>
                  <CvPage layout={layout} style={{ ...value, template: id }} />
                  <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white to-transparent" />
                </div>
                <span className="flex items-center justify-between gap-1 px-1 pb-0.5">
                  <span className="text-[12.5px] font-medium text-ink">{tp.names[id]?.label ?? template.label}</span>
                  {selected ? <Check className="size-3.5 text-ink" aria-hidden="true" /> : null}
                </span>
                <span className="px-1 pb-1 text-[11px] leading-snug text-muted">{tp.names[id]?.blurb ?? template.blurb}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
        <fieldset>
          <legend className="mb-2 text-[12px] font-medium text-ink">{tp.accent}</legend>
          <div className="flex flex-wrap gap-1">
            {CV_ACCENT_ORDER.map((id) => {
              const accent = CV_ACCENTS[id];
              const selected = value.accent === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={selected}
                  aria-label={tp.accents[id] ?? accent.label}
                  title={tp.accents[id] ?? accent.label}
                  onClick={() => onChange({ ...value, accent: id })}
                  className="grid size-11 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-espresso-btn"
                >
                  <span
                    className={cn(
                      "grid size-7 place-items-center rounded-full transition-shadow",
                      selected && "ring-2 ring-white ring-offset-2 ring-offset-ink/70",
                    )}
                    style={{ background: accent.hex }}
                  >
                    {selected ? <Check className="size-3.5 text-white" aria-hidden="true" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <Toggle
          legend={tp.header}
          items={[
            { id: "center", label: tp.centred },
            { id: "left", label: tp.left },
          ]}
          value={value.header}
          onChange={(header) => onChange({ ...value, header })}
        />

        <Toggle
          legend={tp.spacing}
          items={[
            { id: "normal", label: tp.normal },
            { id: "compact", label: tp.compact },
          ]}
          value={value.density}
          onChange={(density) => onChange({ ...value, density })}
        />
      </div>
    </div>
  );
}

function Toggle<T extends string>({
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
      <legend className="mb-2 text-[12px] font-medium text-ink">{legend}</legend>
      <div className="inline-flex rounded-[6px] bg-sand p-1 ring-1 ring-line">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={value === item.id}
            onClick={() => onChange(item.id)}
            className={cn(
              "min-h-11 rounded-[4px] px-3.5 text-[12.5px] transition-colors md:min-h-9",
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
