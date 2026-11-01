import { Reveal, SplitWords, Stagger, StaggerItem } from "@/components/motion/primitives";

/**
 * Section 8: works with what you have (PRD section 10).
 *
 * A dark panel of square icon tiles. Each tile says how that source is read,
 * because "LinkedIn" on its own would imply an integration that does not exist
 * — LinkedIn blocks automated reading, so the honest label is "paste". The
 * same discipline applies to the whole row: these are formats and sites we can
 * read, not partners.
 */

type Tile = {
  name: string;
  how: string;
  /** A small mark drawn per tile, rather than a logo we have no licence to. */
  glyph: React.ReactNode;
};

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const TILES: Tile[] = [
  {
    name: "PDF",
    how: "Read in your browser",
    glyph: (
      <svg viewBox="0 0 24 24" className="size-6" {...stroke}>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
        <path d="M14 3v5h5" />
        <path d="M9 14h6M9 17h4" />
      </svg>
    ),
  },
  {
    name: "Word",
    how: ".docx, tables and all",
    glyph: (
      <svg viewBox="0 0 24 24" className="size-6" {...stroke}>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
        <path d="M14 3v5h5" />
        <path d="M8.5 12l1.4 5 1.6-3.6L13.1 17l1.4-5" />
      </svg>
    ),
  },
  {
    name: "Google Docs",
    how: "Published to the web",
    glyph: (
      <svg viewBox="0 0 24 24" className="size-6" {...stroke}>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" />
      </svg>
    ),
  },
  {
    name: "Notion",
    how: "Any public page",
    glyph: (
      <svg viewBox="0 0 24 24" className="size-6" {...stroke}>
        <rect x="4" y="4" width="16" height="16" rx="2.5" />
        <path d="M9 16V9l6 7V8" />
      </svg>
    ),
  },
  {
    name: "LinkedIn",
    how: "Paste the text — they block reading",
    glyph: (
      <svg viewBox="0 0 24 24" className="size-6" {...stroke}>
        <rect x="4" y="4" width="16" height="16" rx="2.5" />
        <path d="M8 11v6M8 8v.01M12 17v-4a2 2 0 0 1 4 0v4" />
      </svg>
    ),
  },
  {
    name: "Career pages",
    how: "Greenhouse, Lever, Workable, Ashby",
    glyph: (
      <svg viewBox="0 0 24 24" className="size-6" {...stroke}>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
        <path d="M3 12h18" />
      </svg>
    ),
  },
];

export function Integrations() {
  return (
    <section className="section-light pb-20 md:pb-28">
      <div className="shell">
        <Reveal
          scale={0.97}
          y={50}
          className="grain relative overflow-hidden rounded-[var(--radius-panel)] bg-espresso px-6 py-14 md:px-12 md:py-20"
        >
          <div
            className="glow-lilac pointer-events-none absolute -bottom-40 left-1/3 size-[560px] opacity-25 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative">
          <div className="max-w-[44ch]">
            <p className="eyebrow eyebrow-on-dark mb-4">Works with what you have</p>
            <SplitWords
              text="No new tools. No new accounts."
              accent={["No"]}
              className="display-2 font-serif text-white"
            />
            <p className="mt-3 text-[13.5px] leading-relaxed text-muted-dark">
              Bring the CV you already have, in whatever format it is in, and
              the job wherever you found it.
            </p>
          </div>

          <Stagger as="ul" gap={0.07} className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {TILES.map((tile) => (
              <StaggerItem as="li" key={tile.name}>
                <div className="group flex h-full flex-col gap-4 rounded-[16px] border border-white/10 bg-espresso-card p-4 transition-[transform,border-color,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1.5 hover:border-lilac/50 hover:bg-espresso-card-raised hover:shadow-[0_20px_50px_-20px_rgba(192,161,247,0.45)]">
                  <span className="flex size-11 items-center justify-center rounded-[12px] bg-white/[0.06] text-white/85 transition-all duration-500 group-hover:rotate-[-6deg] group-hover:scale-110 group-hover:bg-lilac group-hover:text-espresso">
                    {tile.glyph}
                  </span>
                  <span>
                    <span className="block text-[13px] font-medium text-white">
                      {tile.name}
                    </span>
                    <span className="mt-1 block text-[11.5px] leading-relaxed text-muted-dark">
                      {tile.how}
                    </span>
                  </span>
                </div>
              </StaggerItem>
            ))}
          </Stagger>

          <p className="mt-8 text-[11.5px] leading-relaxed text-muted-dark">
            Third-party names are used to describe compatibility only. Callback
            is not affiliated with, or endorsed by, any of them.
          </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
