import Image, { type StaticImageData } from "next/image";
import { cn } from "@/lib/utils";

/**
 * A photograph clipped to a torn-paper edge — the collage language from PRD
 * section 9, applied to real photography.
 *
 * The tear is generated from a fixed seed, so the server and the client draw
 * the identical edge and hydration never flickers. Each instance takes its own
 * `id` because SVG clip paths are document-global.
 */

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A closed path in 0–1 bounding-box units with a jagged edge on every side. */
export function tornPath(seed: number, amplitude = 0.022, steps = 26) {
  const random = seeded(seed);
  const jitter = () => (random() - 0.5) * amplitude * 2;
  const points: Array<[number, number]> = [];

  const edge = (from: [number, number], to: [number, number], inward: [number, number]) => {
    for (let index = 0; index < steps; index += 1) {
      const t = index / steps;
      const depth = amplitude + jitter();
      points.push([
        from[0] + (to[0] - from[0]) * t + inward[0] * depth,
        from[1] + (to[1] - from[1]) * t + inward[1] * depth,
      ]);
    }
  };

  edge([0, 0], [1, 0], [0, 1]);
  edge([1, 0], [1, 1], [-1, 0]);
  edge([1, 1], [0, 1], [0, -1]);
  edge([0, 1], [0, 0], [1, 0]);

  return (
    points
      .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(4)} ${y.toFixed(4)}`)
      .join(" ") + "Z"
  );
}

export function TornPhoto({
  id,
  src,
  alt,
  seed = 7,
  amplitude,
  className,
  imageClassName,
  sizes = "(min-width: 1024px) 480px, 90vw",
  preload,
}: {
  id: string;
  src: StaticImageData;
  alt: string;
  seed?: number;
  amplitude?: number;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  preload?: boolean;
}) {
  return (
    <div className={cn("relative", className)} style={{ clipPath: `url(#${id})` }}>
      <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
        <defs>
          <clipPath id={id} clipPathUnits="objectBoundingBox">
            <path d={tornPath(seed, amplitude)} />
          </clipPath>
        </defs>
      </svg>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        preload={preload}
        placeholder="blur"
        className={cn("object-cover", imageClassName)}
      />
    </div>
  );
}

/** A torn paper shape on its own, for layering behind photos and cards. */
export function TornPaper({
  id,
  seed = 3,
  amplitude = 0.035,
  className,
}: {
  id: string;
  seed?: number;
  amplitude?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      className={cn("pointer-events-none", className)}
      aria-hidden="true"
      focusable="false"
    >
      <path id={id} d={tornPath(seed, amplitude, 18)} fill="currentColor" />
    </svg>
  );
}
