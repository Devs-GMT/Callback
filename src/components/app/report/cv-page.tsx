"use client";

import type { CSSProperties, ReactNode } from "react";
import { orgPrefix, type CvLayout, type CvLine } from "@/lib/analysis/cv-layout";
import { contactRuns, parseInline, stripInline, type InlineRun } from "@/lib/analysis/inline";
import {
  CV_HAIRLINE,
  headerRule,
  headlineColour,
  CV_INK,
  CV_MUTED,
  CV_PAGE,
  resolveCvStyle,
  type CvStyle,
  type FontFamily,
  type ResolvedCvStyle,
} from "@/lib/cv-templates";
import { cn } from "@/lib/utils";

/**
 * The CV as a page, drawn from the same template numbers as the PDF.
 *
 * Every size is in points scaled to the container's width (`cqw`), so the
 * preview is a true miniature of the A4 download at any screen size rather
 * than an approximation that reflows differently.
 */

/** `n` points on an A4 page as wide as the container. */
export const pt = (n: number) => `calc(${n.toFixed(2)} * 100cqw / ${CV_PAGE.width})`;

/** Text with its bold, italic and link markers rendered. */
export function Inline({ text, runs }: { text?: string; runs?: InlineRun[] }) {
  return (runs ?? parseInline(text ?? "")).map((run, index) => {
    const style: CSSProperties = {
      fontWeight: run.bold ? 700 : undefined,
      fontStyle: run.italic ? "italic" : undefined,
    };
    return run.href ? (
      <a key={index} href={run.href} target="_blank" rel="noopener noreferrer" style={{ ...style, color: "inherit" }}>
        {run.text}
      </a>
    ) : (
      <span key={index} style={style}>
        {run.text}
      </span>
    );
  });
}

const FAMILY: Record<FontFamily, string> = {
  sans: "var(--font-inter), Arial, sans-serif",
  serif: "var(--font-newsreader), Georgia, serif",
};

/** Mint wash on lines a suggestion changed, with the original on hover. */
function changedProps(line?: Pick<CvLine, "changed" | "replaced">) {
  return {
    className: cn(line?.changed && "rounded-[2px] bg-mint/55 box-decoration-clone"),
    title: line?.replaced ? `Was: ${line.replaced.trim()}` : undefined,
  };
}

/** The page shell: white sheet, template margins, body type. */
export function CvSheet({
  style,
  children,
  className,
}: {
  style: CvStyle;
  children: (s: ResolvedCvStyle) => ReactNode;
  className?: string;
}) {
  const s = resolveCvStyle(style);
  return (
    <div className={cn("@container w-full", className)}>
      <article
        // A flex column so margins add up as they do in the PDF instead of
        // collapsing into each other.
        className="flex w-full flex-col break-words bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06),0_8px_24px_-12px_rgba(0,0,0,0.18)] ring-1 ring-black/5"
        style={{
          minHeight: pt(CV_PAGE.height),
          padding: `${pt(s.margin.y)} ${pt(s.margin.x)}`,
          fontFamily: FAMILY[s.font.body],
          fontSize: pt(s.size.body),
          lineHeight: s.space.line,
          color: CV_INK,
        }}
      >
        {children(s)}
      </article>
    </div>
  );
}

export function CvHeader({
  s,
  name,
  headline,
  lines,
}: {
  s: ResolvedCvStyle;
  name?: CvLine;
  headline?: CvLine;
  lines: CvLine[];
}) {
  const align = s.header === "center" ? "center" : "left";
  return (
    <header
      style={{
        textAlign: align,
        ...(headerRule(s)
          ? {
              paddingBottom: pt(s.space.section * 0.55),
              borderBottom: `${pt(0.6)} solid ${CV_HAIRLINE}`,
              marginBottom: pt(s.space.section * 0.15),
            }
          : { marginBottom: pt(s.space.section * 0.2) }),
      }}
    >
      {name ? (
        <h2
          style={{
            fontFamily: FAMILY[s.font.name],
            fontSize: pt(s.size.name),
            fontWeight: s.nameBold ? 600 : 400,
            lineHeight: 1.12,
            letterSpacing: s.font.name === "sans" ? "-0.01em" : undefined,
            color: s.nameInAccent ? s.accent : CV_INK,
            textTransform: s.caps ? "uppercase" : undefined,
            marginBottom: pt(s.size.name * 0.28),
          }}
        >
          <span {...changedProps(name)}>{stripInline(name.text)}</span>
        </h2>
      ) : null}
      {headline ? (
        <p
          style={{
            fontSize: pt(s.size.body + 1.5),
            fontWeight: 600,
            color: headlineColour(s),
            textTransform: s.caps ? "uppercase" : undefined,
            marginBottom: pt(3),
          }}
        >
          <span {...changedProps(headline)}><Inline text={headline.text} /></span>
        </p>
      ) : null}
      {lines.map((line, index) => (
        <p key={index} style={{ fontSize: pt(s.size.small), color: line.links ? s.accent : CV_MUTED }}>
          <span {...changedProps(line)}><Inline runs={contactRuns(line.text)} /></span>
        </p>
      ))}
    </header>
  );
}

export function CvHeading({ s, text }: { s: ResolvedCvStyle; text: string }) {
  const ruled = s.heading === "rule";
  const style: CSSProperties = {
    fontFamily: FAMILY[s.font.heading],
    fontSize: pt(s.size.heading),
    fontWeight: 600,
    letterSpacing: `${s.headingTracking}em`,
    lineHeight: 1.2,
    color: ruled ? CV_INK : s.accent,
    marginTop: pt(s.space.section),
    marginBottom: pt(s.space.afterHeading),
    paddingBottom: s.heading === "accent" ? 0 : pt(3),
    borderBottom: ruled ? `${pt(0.7)} solid ${s.accent}` : undefined,
  };
  return (
    <h3 style={style}>
      {text}
      {s.heading === "accent-rule" ? (
        <span
          aria-hidden="true"
          style={{ display: "block", width: pt(22), height: pt(1.3), marginTop: pt(3), background: s.accent }}
        />
      ) : null}
    </h3>
  );
}

/** A section's lines, with consecutive bullets grouped into one real list. */
export function CvLines({ s, lines }: { s: ResolvedCvStyle; lines: CvLine[] }) {
  const blocks: Array<CvLine | CvLine[]> = [];
  for (const line of lines) {
    const last = blocks[blocks.length - 1];
    if (line.kind === "bullet" && Array.isArray(last)) last.push(line);
    else blocks.push(line.kind === "bullet" ? [line] : line);
  }

  return (
    <div>
      {blocks.map((block, index) => {
        const top = index === 0 ? 0 : undefined;
        if (Array.isArray(block)) {
          return (
            <ul key={index} style={{ marginTop: top ?? pt(s.space.item), paddingLeft: pt(s.size.body * 1.15) }}>
              {block.map((line, i) => (
                <li
                  key={i}
                  className="list-disc marker:text-[#1a1a1a]"
                  style={{ marginTop: i === 0 ? 0 : pt(s.space.item) }}
                >
                  <span {...changedProps(line)}><Inline text={line.text} /></span>
                </li>
              ))}
            </ul>
          );
        }
        if (block.kind === "gap") {
          return <div key={index} aria-hidden="true" style={{ height: pt(s.space.entry * 0.5) }} />;
        }
        if (block.kind === "entry") {
          return <CvEntry key={index} s={s} line={block} first={index === 0} />;
        }
        if (block.kind === "subtitle") {
          return (
            <p key={index} style={{ fontStyle: "italic", color: CV_MUTED }}>
              <span {...changedProps(block)}><Inline text={block.text} /></span>
            </p>
          );
        }
        return (
          <p key={index} style={{ marginTop: top ?? pt(s.space.item) }}>
            <span {...changedProps(block)}><Inline text={block.text} /></span>
          </p>
        );
      })}
    </div>
  );
}

function CvEntry({ s, line, first }: { s: ResolvedCvStyle; line: CvLine; first: boolean }) {
  const parts = line.parts;
  return (
    <div
      className="flex items-baseline justify-between"
      style={{ marginTop: first ? 0 : pt(s.space.entry), columnGap: pt(12) }}
    >
      <p className="min-w-0">
        <span {...changedProps(line)}>
          <span style={{ fontWeight: 600 }}><Inline text={parts ? parts.title : line.text} /></span>
          {parts?.org ? <span>{orgPrefix(parts)}<Inline text={parts.org} /></span> : null}
        </span>
      </p>
      {parts?.dates ? (
        <span className="shrink-0 whitespace-nowrap" style={{ fontSize: pt(s.size.small), color: CV_MUTED }}>
          {parts.dates}
        </span>
      ) : null}
    </div>
  );
}

/** The whole CV in the chosen template. */
export function CvPage({ layout, style }: { layout: CvLayout; style: CvStyle }) {
  return (
    <CvSheet style={style}>
      {(s) => (
        <>
          <CvHeader s={s} name={layout.name} headline={layout.headline} lines={layout.contact} />
          {layout.sections.map((section, index) => (
            <section key={index}>
              <CvHeading s={s} text={section.heading} />
              <CvLines s={s} lines={section.lines} />
            </section>
          ))}
        </>
      )}
    </CvSheet>
  );
}
