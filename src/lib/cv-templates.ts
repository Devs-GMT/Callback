/**
 * CV design templates.
 *
 * One description of each template drives three renderers: the on-screen
 * preview, the PDF and the .docx. Keeping the numbers here, in points, rather
 * than in three places is what makes the download look like the preview.
 *
 * Every template is single-column with conventional upper-case headings, no
 * tables, text boxes, images or photo. That is the layout the ATS check
 * rewards, and the promise the product makes: changing the look never costs
 * the score. Templates differ only in type, colour and spacing.
 */

export type CvTemplateId = "classic" | "modern" | "compact" | "elegant";
export type CvAccentId = "espresso" | "navy" | "teal" | "forest" | "plum" | "slate";
export type CvDensity = "normal" | "compact";

export type CvStyle = {
  template: CvTemplateId;
  accent: CvAccentId;
  density: CvDensity;
};

export type FontFamily = "serif" | "sans";

/**
 * How a section heading is drawn.
 * - `rule`: heading, then a full-width hairline in the accent colour
 * - `accent`: heading set in the accent colour, no line
 * - `accent-rule`: accent heading over a short accent bar
 */
export type HeadingStyle = "rule" | "accent" | "accent-rule";

export type CvTemplate = {
  id: CvTemplateId;
  label: string;
  blurb: string;
  font: { name: FontFamily; heading: FontFamily; body: FontFamily };
  /** Name weight; the serif name in Elegant is deliberately light. */
  nameBold: boolean;
  nameInAccent: boolean;
  header: "left" | "center";
  heading: HeadingStyle;
  /**
   * Letter spacing on headings, as a fraction of the heading size. Kept at
   * 0.05 or under: from about 0.09 em, PDF text extraction (and so an ATS)
   * starts reading "EXPERIENCE" as "E X P E R I E N C E".
   */
  headingTracking: number;
  size: { name: number; heading: number; body: number; small: number };
  /** Vertical rhythm in points; `line` is a multiple of the font size. */
  space: { section: number; afterHeading: number; entry: number; item: number; line: number };
  margin: { x: number; y: number };
};

export const CV_TEMPLATES: Record<CvTemplateId, CvTemplate> = {
  classic: {
    id: "classic",
    label: "Classic",
    blurb: "Serif, centred header. Law, finance, academia.",
    font: { name: "serif", heading: "serif", body: "serif" },
    nameBold: true,
    nameInAccent: false,
    header: "center",
    heading: "rule",
    headingTracking: 0.04,
    size: { name: 22, heading: 10.5, body: 10.5, small: 9.5 },
    space: { section: 14, afterHeading: 6, entry: 6, item: 2.5, line: 1.3 },
    margin: { x: 54, y: 48 },
  },
  modern: {
    id: "modern",
    label: "Modern",
    blurb: "Clean sans, coloured headings. Most roles.",
    font: { name: "sans", heading: "sans", body: "sans" },
    nameBold: true,
    nameInAccent: true,
    header: "left",
    heading: "accent",
    headingTracking: 0.05,
    size: { name: 24, heading: 9.5, body: 9.75, small: 9 },
    space: { section: 15, afterHeading: 5, entry: 7, item: 2.5, line: 1.38 },
    margin: { x: 50, y: 46 },
  },
  compact: {
    id: "compact",
    label: "Compact",
    blurb: "Dense, fits one page. Tech and graduates.",
    font: { name: "sans", heading: "sans", body: "sans" },
    nameBold: true,
    nameInAccent: false,
    header: "left",
    heading: "rule",
    headingTracking: 0.03,
    size: { name: 18, heading: 9, body: 9, small: 8.5 },
    space: { section: 10, afterHeading: 4, entry: 4.5, item: 1.5, line: 1.28 },
    margin: { x: 40, y: 34 },
  },
  elegant: {
    id: "elegant",
    label: "Elegant",
    blurb: "Serif name, quiet accents. Senior and creative.",
    font: { name: "serif", heading: "sans", body: "sans" },
    nameBold: false,
    nameInAccent: false,
    header: "left",
    heading: "accent-rule",
    headingTracking: 0.05,
    size: { name: 28, heading: 8.5, body: 9.75, small: 9 },
    space: { section: 17, afterHeading: 7, entry: 7, item: 2.5, line: 1.42 },
    margin: { x: 56, y: 50 },
  },
};

/** The most tracking a heading may carry and still extract as one word. */
export const MAX_HEADING_TRACKING = 0.05;

export const CV_TEMPLATE_ORDER: CvTemplateId[] = ["modern", "classic", "compact", "elegant"];

/** Dark, print-safe accents: each holds at least 7:1 against white. */
export const CV_ACCENTS: Record<CvAccentId, { label: string; hex: string }> = {
  espresso: { label: "Espresso", hex: "#3b2416" },
  navy: { label: "Navy", hex: "#1f3a5f" },
  teal: { label: "Teal", hex: "#0f5560" },
  forest: { label: "Forest", hex: "#24503a" },
  plum: { label: "Plum", hex: "#4f2f6b" },
  slate: { label: "Slate", hex: "#36414d" },
};

export const CV_ACCENT_ORDER: CvAccentId[] = ["espresso", "navy", "teal", "forest", "plum", "slate"];

export const DEFAULT_CV_STYLE: CvStyle = { template: "modern", accent: "navy", density: "normal" };

/** Near-black body text and the grey for dates and contact details. */
export const CV_INK = "#1a1a1a";
export const CV_MUTED = "#555555";

/** A4 in points. */
export const CV_PAGE = { width: 595.28, height: 841.89 } as const;

/** A template with the density applied, ready for a renderer. */
export type ResolvedCvStyle = CvTemplate & { accent: string };

export function resolveCvStyle(style: CvStyle): ResolvedCvStyle {
  const template = CV_TEMPLATES[style.template] ?? CV_TEMPLATES[DEFAULT_CV_STYLE.template];
  const accent = (CV_ACCENTS[style.accent] ?? CV_ACCENTS[DEFAULT_CV_STYLE.accent]).hex;
  if (style.density !== "compact") return { ...template, accent };

  // Tighter rather than smaller: spacing gives way first, type only a little,
  // so a compact CV is still comfortable to read on paper.
  const s = template.space;
  return {
    ...template,
    accent,
    size: {
      ...template.size,
      body: template.size.body - 0.5,
      small: template.size.small - 0.25,
    },
    space: {
      section: s.section * 0.7,
      afterHeading: s.afterHeading * 0.8,
      entry: s.entry * 0.7,
      item: s.item * 0.6,
      line: Math.max(1.2, s.line - 0.08),
    },
    margin: { x: template.margin.x * 0.85, y: template.margin.y * 0.8 },
  };
}

/** Narrow an unknown value (from localStorage) back to a valid style. */
export function parseCvStyle(value: unknown): CvStyle {
  const raw = (value ?? {}) as Partial<CvStyle>;
  return {
    template: raw.template && raw.template in CV_TEMPLATES ? raw.template : DEFAULT_CV_STYLE.template,
    accent: raw.accent && raw.accent in CV_ACCENTS ? raw.accent : DEFAULT_CV_STYLE.accent,
    density: raw.density === "compact" ? "compact" : "normal",
  };
}

export function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}
