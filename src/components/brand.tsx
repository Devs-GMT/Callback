import { HomeLink } from "@/i18n/link";
import { cn } from "@/lib/utils";

/**
 * Callback's own brand marks.
 *
 * PRD section 9 asks for a small vintage phone-handset mark in the logo, and
 * for a torn-paper collage edge closing the footer in layered espresso and
 * lilac. Both are drawn here as SVG rather than imported as images: the mark
 * has to stay crisp at 16px in a browser tab, and the torn edge has to stretch
 * to any viewport width without the seams a bitmap would show.
 *
 * None of this reproduces the reference site's branding — the handset and the
 * tear shapes are drawn for this project.
 */

/* -------------------------------------------------------------------------- */
/* Handset mark                                                               */
/* -------------------------------------------------------------------------- */

/**
 * A vintage handset, seen at the angle a receiver rests at when lifted: two
 * flared cups joined by a slim arched bar.
 */
export function HandsetMark({
  className,
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-[1em]", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : "true"}
      aria-label={title}
      fill="currentColor"
    >
      {/* The arched body of the receiver. */}
      <path
        d="M6.6 8.05c.9-2.6 3-4.3 5.4-4.3s4.5 1.7 5.4 4.3a.95.95 0 0 1-.63 1.2l-1.66.5a.95.95 0 0 1-1.16-.6c-.42-1.18-1.14-1.83-1.95-1.83s-1.53.65-1.95 1.83a.95.95 0 0 1-1.16.6l-1.66-.5a.95.95 0 0 1-.63-1.2Z"
        opacity="0.55"
      />
      {/* Earpiece cup. */}
      <path d="M3.3 7.1a1.7 1.7 0 0 1 2.1-1.18l2.26.65a1.7 1.7 0 0 1 1.16 2.14l-.72 2.5a1.7 1.7 0 0 1-2.07 1.17l-2.3-.63A1.7 1.7 0 0 1 2.56 9.6Z" />
      {/* Mouthpiece cup. */}
      <path d="M20.7 7.1a1.7 1.7 0 0 0-2.1-1.18l-2.26.65a1.7 1.7 0 0 0-1.16 2.14l.72 2.5a1.7 1.7 0 0 0 2.07 1.17l2.3-.63a1.7 1.7 0 0 0 1.17-1.15Z" />
      {/* The coiled cord, which is what reads as "vintage" at small sizes. */}
      <path
        d="M12 13.4c0 1.5 1.1 2.2 2.3 2.6 1.2.4 2.2 1 2.2 2.3s-1.1 2.1-2.4 2.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.75"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Logo mark                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The Callback mark: a lilac tile holding a "C" drawn as an arrow that comes
 * back round on itself — the call coming back — with a tick at its centre for
 * the CV that passed. Three strokes and a tile, so it still reads at 16px in a
 * browser tab, where the handset above turns into a smudge.
 *
 * The same geometry is exported as `LOGO_MARK_SVG` for the favicon, so the tab
 * icon and the on-page mark can never drift apart.
 */
const MARK_ARC = "M22.5 21.5A8.5 8.5 0 1 1 22.5 10.5";
const MARK_ARROW = "M24.6 13.1 25.3 8.2 20.6 9.9Z";
const MARK_TICK = "M12.4 16.3l2.6 2.7 4.8-5.2";

export function LogoMark({
  className,
  title,
  tile = "#C0A1F7",
  ink = "#1C1009",
}: {
  className?: string;
  title?: string;
  tile?: string;
  ink?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-[1em] shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : "true"}
      aria-label={title}
    >
      <rect width="32" height="32" rx="9" fill={tile} />
      {/* The returning arrow spins once on hover (see .logo-spin). */}
      <g className="logo-spin">
        <path d={MARK_ARC} fill="none" stroke={ink} strokeWidth="3.4" strokeLinecap="round" />
        <path d={MARK_ARROW} fill={ink} stroke={ink} strokeWidth="1.2" strokeLinejoin="round" />
      </g>
      <path
        d={MARK_TICK}
        fill="none"
        stroke={ink}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The mark as a standalone SVG document, for icons. */
export const LOGO_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="9" fill="#C0A1F7"/><path d="${MARK_ARC}" fill="none" stroke="#1C1009" stroke-width="3.4" stroke-linecap="round"/><path d="${MARK_ARROW}" fill="#1C1009" stroke="#1C1009" stroke-width="1.2" stroke-linejoin="round"/><path d="${MARK_TICK}" fill="none" stroke="#1C1009" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/* -------------------------------------------------------------------------- */
/* Wordmark                                                                   */
/* -------------------------------------------------------------------------- */

export function Wordmark({
  on = "light",
  href = "/",
  className,
}: {
  on?: "light" | "dark";
  /** Pass null to render the mark without wrapping it in a link. */
  href?: string | null;
  className?: string;
}) {
  const content = (
    <span
      className={cn(
        "group/logo inline-flex items-center gap-2.5 font-serif text-[23px] leading-none tracking-[-0.02em]",
        on === "dark" ? "text-white" : "text-ink",
        className,
      )}
    >
      <LogoMark className="text-[1.3em] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/logo:-rotate-6 group-hover/logo:scale-105" />
      <span>
        Call
        <span
          className={cn(
            "italic transition-colors duration-300",
            on === "dark"
              ? "text-lilac group-hover/logo:text-white"
              : "text-[#8a63d2] group-hover/logo:text-lilac",
          )}
        >
          back
        </span>
      </span>
    </span>
  );

  if (href === null) return content;

  return (
    <HomeLink href={href} className="inline-flex rounded-[4px]">
      {content}
    </HomeLink>
  );
}
/* -------------------------------------------------------------------------- */
/* Torn paper edge                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Two torn paper strips, espresso behind lilac.
 *
 * The tear is an explicit path rather than a generated one so it is identical
 * on the server and the client — a randomised edge would hydrate differently
 * and flicker. `preserveAspectRatio="none"` lets it stretch to any width,
 * which is fine for a torn edge where exact proportions carry no meaning.
 */
export function TornPaperEdge({
  className,
  height = 56,
}: {
  className?: string;
  height?: number;
}) {
  return (
    <div
      className={cn("pointer-events-none w-full select-none", className)}
      style={{ height }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 1440 56"
        preserveAspectRatio="none"
        className="size-full"
        focusable="false"
      >
        {/* Lilac layer, peeking above the espresso one. */}
        <path
          fill="#C0A1F7"
          d="M0 18 38 13 76 20 118 11 158 19 196 9 240 17 282 10 322 20 366 12 404 21 446 13 488 22 530 14 572 23 614 15 656 24 698 16 740 25 782 17 824 26 866 18 908 27 950 19 992 28 1034 20 1076 29 1118 21 1160 30 1202 22 1244 31 1286 23 1328 32 1370 24 1406 33 1440 26 1440 56 0 56Z"
        />
        {/* Espresso layer in front, with its own independent tear. */}
        <path
          fill="#1C1009"
          d="M0 31 34 26 72 34 112 25 152 33 192 24 234 32 274 25 316 34 358 27 398 35 440 28 482 36 524 29 566 37 608 30 650 38 692 31 734 39 776 32 818 40 860 33 902 41 944 34 986 42 1028 35 1070 43 1112 36 1154 44 1196 37 1238 45 1280 38 1322 46 1364 39 1402 47 1440 41 1440 56 0 56Z"
        />
      </svg>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* BOT Chain mark                                                             */
/* -------------------------------------------------------------------------- */

/**
 * A neutral chain-link glyph used on the "Built on BOT Chain" badge.
 *
 * Deliberately generic: BOT Chain's actual logo is their trademark, so this
 * stands in as a link symbol next to the text rather than reproducing a mark
 * this project has no licence to.
 */
export function ChainGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-[1em]", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M9.6 14.4 14.4 9.6" />
      <path d="M12.9 7.5l1.4-1.4a3.4 3.4 0 0 1 4.8 4.8l-1.4 1.4" />
      <path d="M11.1 16.5l-1.4 1.4a3.4 3.4 0 0 1-4.8-4.8l1.4-1.4" />
    </svg>
  );
}
