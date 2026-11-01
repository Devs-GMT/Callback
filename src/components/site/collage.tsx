/**
 * The collage artwork (PRD sections 9 and 10).
 *
 * The brief asks for cut-out collage art — a bust in a torn circle, a paper
 * plane with lilac paper, a key, a retro phone, a clock — in espresso and
 * lilac. These are drawn as SVG rather than generated or sourced as images,
 * which means the whole visual language is owned by this project outright,
 * carries no stock licence, scales to any size, and costs a few kilobytes
 * instead of a few hundred.
 *
 * The shared vocabulary across all of them: a torn paper disc behind the
 * subject, one lilac accent shape, and a flat espresso silhouette on top. That
 * repetition is what makes five separate drawings read as one set.
 */

import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Shared pieces                                                              */
/* -------------------------------------------------------------------------- */

/**
 * A torn paper disc. The irregular edge is an explicit path rather than a
 * generated one, so every render is identical and the server and client agree.
 */
function TornDisc({
  fill,
  transform,
}: {
  fill: string;
  transform?: string;
}) {
  return (
    <path
      transform={transform}
      fill={fill}
      d="M100 14c13 0 18-6 29-3s13 11 23 17 20 2 25 12-2 19 1 30 8 17 4 27-15 11-22 19-7 20-17 25-19-2-30-1-18 8-29 6-14-13-23-19-21-6-25-16 3-18 1-29-8-18-4-28 16-10 23-18 6-20 16-25 15 3 28 3Z"
    />
  );
}

/** The lilac torn paper strip used as an accent across the set. */
function LilacStrip({ transform }: { transform?: string }) {
  return (
    <path
      transform={transform}
      fill="#C0A1F7"
      d="M8 10 32 4l24 8 24-6 24 9 24-7 18 8-3 22-20 6-24-8-24 7-24-9-24 6-20-7Z"
    />
  );
}

export type CollageArtProps = {
  className?: string;
};

const SVG_BASE = "h-full w-full";

/** Trig results differ in the last digits between server and browser, which
 *  breaks hydration; two decimals is far below a pixel. */
const round = (value: number) => Math.round(value * 100) / 100;

/* -------------------------------------------------------------------------- */
/* 1. Magnifier over a CV page — "Get past the ATS"                           */
/* -------------------------------------------------------------------------- */

export function CollageMagnifier({ className }: CollageArtProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={cn(SVG_BASE, className)}
      role="img"
      aria-label="A magnifying glass over a CV page"
    >
      <TornDisc fill="#E8E0DA" />
      <LilacStrip transform="translate(18 132) rotate(-8)" />

      {/* The CV page, with ruled lines standing in for text. */}
      <g transform="translate(52 42)">
        <rect width="86" height="112" rx="3" fill="#FCFCFC" />
        <rect x="10" y="12" width="40" height="5" rx="2.5" fill="#1C1009" />
        <g fill="#746B68" opacity="0.5">
          <rect x="10" y="26" width="64" height="3" rx="1.5" />
          <rect x="10" y="35" width="52" height="3" rx="1.5" />
          <rect x="10" y="50" width="30" height="3.5" rx="1.75" fill="#1C1009" opacity="0.8" />
          <rect x="10" y="60" width="64" height="3" rx="1.5" />
          <rect x="10" y="69" width="58" height="3" rx="1.5" />
          <rect x="10" y="78" width="44" height="3" rx="1.5" />
          <rect x="10" y="92" width="26" height="3.5" rx="1.75" fill="#1C1009" opacity="0.8" />
        </g>
      </g>

      {/* The lens, drawn over the page so it reads as sitting on top. */}
      <g className="animate-float-slow">
      <g transform="translate(96 92)">
        <circle r="38" fill="#FCFCFC" opacity="0.35" />
        <circle r="38" fill="none" stroke="#1C1009" strokeWidth="7" />
        <path
          d="M27 27 52 52"
          stroke="#1C1009"
          strokeWidth="11"
          strokeLinecap="round"
        />
      </g>
      </g>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Paper plane with lilac paper — "Send better applications"                */
/* -------------------------------------------------------------------------- */

export function CollagePaperPlane({ className }: CollageArtProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={cn(SVG_BASE, className)}
      role="img"
      aria-label="A paper plane over torn lilac paper"
    >
      <TornDisc fill="#F6DED5" />

      {/* A torn lilac wedge, giving the plane something to fly across. */}
      <path
        fill="#C0A1F7"
        d="M22 124 58 108l30 14 34-18 32 16 22-8-6 44-26 8-30-12-32 16-30-14-26 10Z"
      />

      {/* The plane: two flat panels, light and espresso, as cut paper. */}
      <g className="animate-float-slower">
      <g transform="translate(100 88) rotate(-16)">
        <path d="M-56-26 56-4-10 30Z" fill="#FCFCFC" />
        <path d="M-56-26 -10 30 -4 2Z" fill="#1C1009" />
        <path
          d="M-56-26 56-4"
          stroke="#1C1009"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.35"
        />
      </g>
      </g>

      {/* The flight trail, as a dashed arc. */}
      <path
        d="M24 150c28-16 50-30 66-44"
        stroke="#1C1009"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="2 9"
        fill="none"
        opacity="0.45"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Key in a torn circle — "Unlock the right keywords"                      */
/* -------------------------------------------------------------------------- */

export function CollageKey({ className }: CollageArtProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={cn(SVG_BASE, className)}
      role="img"
      aria-label="A key inside a torn paper circle"
    >
      <TornDisc fill="#E8E0DA" />
      <circle cx="100" cy="100" r="54" fill="#C0A1F7" opacity="0.55" />

      <g transform="translate(100 100) rotate(-38)">
        {/* Bow. */}
        <circle cx="-34" cy="0" r="21" fill="none" stroke="#1C1009" strokeWidth="9" />
        {/* Shank. */}
        <rect x="-13" y="-4.5" width="60" height="9" rx="4.5" fill="#1C1009" />
        {/* Teeth. */}
        <rect x="26" y="4" width="9" height="15" rx="2" fill="#1C1009" />
        <rect x="40" y="4" width="9" height="22" rx="2" fill="#1C1009" />
      </g>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Retro phone — "Get the callback"                                        */
/* -------------------------------------------------------------------------- */

export function CollageRetroPhone({ className }: CollageArtProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={cn(SVG_BASE, className)}
      role="img"
      aria-label="A ringing retro telephone over torn lilac paper"
    >
      <TornDisc fill="#F7E6B0" />
      <LilacStrip transform="translate(14 56) rotate(6)" />

      {/* Body. */}
      <g transform="translate(100 118)">
        <path
          d="M-46 22c0-26 20-44 46-44s46 18 46 44c0 7-5 11-12 11H-34c-7 0-12-4-12-11Z"
          fill="#1C1009"
        />
        {/* Dial. */}
        <circle cy="4" r="19" fill="#FCFCFC" />
        <circle cy="4" r="6" fill="#1C1009" opacity="0.25" />
        {[0, 60, 120, 180, 240, 300].map((angle) => (
          <circle
            key={angle}
            cx={round(13 * Math.cos((angle * Math.PI) / 180))}
            cy={round(4 + 13 * Math.sin((angle * Math.PI) / 180))}
            r="2.4"
            fill="#1C1009"
            opacity="0.45"
          />
        ))}
      </g>

      {/* Handset resting on the cradle. */}
      <g className="animate-ring" style={{ transformOrigin: "100px 90px", transformBox: "view-box" }}>
      <g transform="translate(100 78)">
        <rect x="-50" y="-7" width="100" height="14" rx="7" fill="#1C1009" />
        <rect x="-58" y="-13" width="22" height="26" rx="7" fill="#1C1009" />
        <rect x="36" y="-13" width="22" height="26" rx="7" fill="#1C1009" />
      </g>
      </g>

      {/* Ring lines — the moment the whole product is named after. */}
      <g stroke="#1C1009" strokeWidth="3" strokeLinecap="round" fill="none" className="animate-pulse">
        <path d="M30 58c-6-6-9-13-9-21" />
        <path d="M44 48c-4-4-6-9-6-14" />
        <path d="M170 58c6-6 9-13 9-21" />
        <path d="M156 48c4-4 6-9 6-14" />
      </g>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Clock — "Save hours per application"                                    */
/* -------------------------------------------------------------------------- */

export function CollageClock({ className }: CollageArtProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={cn(SVG_BASE, className)}
      role="img"
      aria-label="A clock face on torn paper"
    >
      <TornDisc fill="#C6E6D3" />

      {/* A torn quarter in lilac, which also reads as time elapsed. */}
      <path
        fill="#C0A1F7"
        d="M100 100 100 42a58 58 0 0 1 58 58Z"
        opacity="0.75"
      />

      <circle cx="100" cy="100" r="52" fill="#FCFCFC" />
      <circle cx="100" cy="100" r="52" fill="none" stroke="#1C1009" strokeWidth="7" />

      {/* Hour ticks. */}
      <g stroke="#1C1009" strokeWidth="3.5" strokeLinecap="round" opacity="0.55">
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => {
          const radians = ((angle - 90) * Math.PI) / 180;
          const long = angle % 90 === 0;
          const inner = long ? 36 : 41;
          return (
            <path
              key={angle}
              d={`M${round(100 + inner * Math.cos(radians))} ${round(100 + inner * Math.sin(radians))}L${round(100 + 45 * Math.cos(radians))} ${round(100 + 45 * Math.sin(radians))}`}
            />
          );
        })}
      </g>

      {/* Hands, set to a plausible time rather than a flat 10:10. */}
      <path
        d="M100 100 100 68"
        stroke="#1C1009"
        strokeWidth="6"
        strokeLinecap="round"
        className="animate-spin-slow"
        style={{ transformOrigin: "100px 100px", transformBox: "view-box" }}
      />
      <path d="M100 100 128 114" stroke="#1C1009" strokeWidth="5" strokeLinecap="round" />
      <circle cx="100" cy="100" r="5" fill="#1C1009" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. Classical bust in a torn circle — the carousel's opening card           */
/* -------------------------------------------------------------------------- */

export function CollageBust({ className }: CollageArtProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={cn(SVG_BASE, className)}
      role="img"
      aria-label="A classical bust inside a torn paper circle"
    >
      <TornDisc fill="#E8E0DA" />
      <circle cx="100" cy="96" r="56" fill="#C0A1F7" opacity="0.45" />

      {/* A flat, cut-paper profile: forehead, nose, lips, chin, neck. */}
      <path
        fill="#1C1009"
        d="M116 44c-19-5-37 4-44 21-5 12-3 20-9 29-4 6-1 10 4 11l6 1-2 9c-1 5 2 8 7 8l5-1v12c0 6 4 9 10 9h38c7 0 11-4 11-11l-1-24c10-11 13-26 8-39-5-14-16-22-33-25Z"
      />
      {/* Plinth. */}
      <rect x="62" y="150" width="76" height="12" rx="2" fill="#1C1009" opacity="0.85" />
      <rect x="54" y="162" width="92" height="8" rx="2" fill="#1C1009" opacity="0.6" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Hero artwork                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The hero image card (PRD section 10, section 1).
 *
 * The brief calls for a photo of a job seeker at a desk with hand-drawn UI
 * lines over it. With no photography available, this is an art-directed
 * illustration in the same espresso and lilac palette, built to occupy the
 * exact frame a photo would — so dropping a real image in later is a matter of
 * swapping this one element.
 *
 * The faint sketch lines from the brief sit on top either way, which is the
 * detail that makes the frame read as "a CV being worked on" rather than
 * decoration.
 */
export function HeroArtwork({ className }: CollageArtProps) {
  return (
    <svg
      viewBox="0 0 960 600"
      className={cn("h-full w-full", className)}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="An illustration of someone reviewing their CV at a desk"
    >
      <defs>
        {/* A warm tonal grade, standing in for a photo's light. */}
        <linearGradient id="hero-wall" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#3b2a20" />
          <stop offset="1" stopColor="#1c1009" />
        </linearGradient>
        <linearGradient id="hero-desk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6b4a34" />
          <stop offset="1" stopColor="#452d1f" />
        </linearGradient>
        <radialGradient id="hero-lamp" cx="0.76" cy="0.2" r="0.5">
          <stop offset="0" stopColor="#f7e6b0" stopOpacity="0.5" />
          <stop offset="1" stopColor="#f7e6b0" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="960" height="600" fill="url(#hero-wall)" />
      <rect width="960" height="600" fill="url(#hero-lamp)" />

      {/* Window, giving the scene a light source and some geometry. */}
      <g opacity="0.3">
        <rect x="56" y="54" width="206" height="250" rx="6" fill="#C0A1F7" opacity="0.35" />
        <path
          d="M159 54v250M56 179h206"
          stroke="#FCFCFC"
          strokeWidth="4"
          opacity="0.5"
        />
      </g>

      {/* Desk. */}
      <rect y="432" width="960" height="168" fill="url(#hero-desk)" />
      <rect y="432" width="960" height="5" fill="#FCFCFC" opacity="0.18" />

      {/* The person, as a flat cut-paper silhouette at the desk. */}
      <g transform="translate(300 180)">
        {/* Torso. */}
        <path
          d="M-96 252c0-74 44-124 96-124s96 50 96 124Z"
          fill="#231710"
        />
        {/* Head. */}
        <circle cy="78" r="54" fill="#231710" />
        {/* Hair, as a separate cut shape. */}
        <path
          d="M-56 66c2-32 26-54 56-54s54 22 56 54c-14-18-32-24-56-24s-42 6-56 24Z"
          fill="#1a110c"
        />
        {/* Arm reaching toward the page. */}
        <path
          d="M58 236c38-12 74-28 98-44l20 28c-28 22-70 40-112 50Z"
          fill="#2b1c14"
        />
      </g>

      {/* The CV on the desk, catching the light. */}
      <g transform="translate(540 330) rotate(-7)">
        <rect width="250" height="150" rx="4" fill="#FCFCFC" opacity="0.94" />
        <rect x="22" y="22" width="92" height="9" rx="4.5" fill="#1C1009" />
        <g fill="#746B68" opacity="0.55">
          <rect x="22" y="46" width="180" height="5" rx="2.5" />
          <rect x="22" y="60" width="150" height="5" rx="2.5" />
          <rect x="22" y="82" width="70" height="6" rx="3" fill="#1C1009" opacity="0.75" />
          <rect x="22" y="100" width="190" height="5" rx="2.5" />
          <rect x="22" y="114" width="162" height="5" rx="2.5" />
        </g>
      </g>

      {/* Mug, because a desk without one is a stock illustration. */}
      <g transform="translate(828 388)">
        <rect x="-26" y="0" width="52" height="46" rx="6" fill="#C0A1F7" />
        <path
          d="M26 12h12a10 10 0 0 1 0 20H26"
          fill="none"
          stroke="#C0A1F7"
          strokeWidth="7"
        />
      </g>

      {/* ---- Hand-drawn UI sketch lines over the scene (PRD §10 §1) ---- */}
      <g className="sketch-stroke" opacity="0.6">
        {/* A checkbox being ticked. */}
        <rect x="596" y="118" width="30" height="30" rx="4" />
        <path d="M602 134l8 9 16-19" strokeLinecap="round" />
        <path d="M644 126h118" strokeLinecap="round" />

        {/* A second, unticked checkbox. */}
        <rect x="596" y="166" width="30" height="30" rx="4" />
        <path d="M644 174h86" strokeLinecap="round" />

        {/* A score dial sketched in the corner. */}
        <circle cx="828" cy="196" r="46" />
        <path
          d="M828 150a46 46 0 0 1 40 69"
          strokeLinecap="round"
          strokeWidth="3"
        />
        <path d="M770 262h116" strokeLinecap="round" />
        <path d="M790 278h76" strokeLinecap="round" />
      </g>
    </svg>
  );
}
