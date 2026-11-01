"use client";

import { motion } from "motion/react";
import { CountUp } from "@/components/motion/primitives";
import { clamp, cn } from "@/lib/utils";

/**
 * The score gauges on the report's Overview tab (PRD section 2 step 4).
 *
 * Drawn as inline SVG rather than pulled from a chart library: there are two
 * of them, they show one number each, and a dependency would cost more than
 * the 40 lines of arc maths below.
 *
 * The band colours are the same mint / yellow / coral scale used for match
 * states, so a glance across the report reads consistently. The number is
 * always shown as text, so the gauge is decoration rather than the only way
 * to read the score.
 */

export type GaugeBand = "good" | "fair" | "poor";

export function bandFor(score: number): GaugeBand {
  if (score >= 75) return "good";
  if (score >= 50) return "fair";
  return "poor";
}

const BAND_STROKE: Record<GaugeBand, string> = {
  good: "#4f9c76",
  fair: "#d9a93a",
  poor: "#cc6a53",
};

const BAND_LABEL: Record<GaugeBand, string> = {
  good: "Strong",
  fair: "Needs work",
  poor: "Weak",
};

export type GaugeProps = {
  /** 0 to 100. */
  value: number;
  label: string;
  /** Rendered after the number, e.g. "%" for the match score. */
  unit?: string;
  size?: number;
  /** Shown under the label, e.g. "was 58%". */
  caption?: string;
  on?: "light" | "dark";
  className?: string;
};

export function Gauge({
  value,
  label,
  unit,
  size = 132,
  caption,
  on = "light",
  className,
}: GaugeProps) {
  const score = clamp(Math.round(value), 0, 100);
  const band = bandFor(score);

  // A 270 degree arc, opening at the bottom, so the needle's travel is
  // readable at a glance without the gauge looking like a pie chart.
  const sweep = 270;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (sweep / 360) * circumference;
  const filled = (score / 100) * arcLength;

  const trackColour = on === "dark" ? "rgba(255,255,255,0.14)" : "rgba(23,18,16,0.09)";

  return (
    <figure className={cn("flex flex-col items-center gap-2", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        {/* An SVG circle's dash starts at 3 o'clock and runs clockwise, so a
            270 degree arc natively spans 3 o'clock round to 12. Rotating by
            135 degrees moves its start to 7:30 and its end to 4:30, which puts
            the opening at the bottom. */}
        <svg
          viewBox="0 0 132 132"
          width={size}
          height={size}
          aria-hidden="true"
          className="rotate-[135deg]"
        >
          <circle
            cx="66"
            cy="66"
            r={radius}
            fill="none"
            stroke={trackColour}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference}`}
          />
          {/* Fills from empty on first paint, and glides to a new value on a
              re-check. */}
          <motion.circle
            cx="66"
            cy="66"
            r={radius}
            fill="none"
            stroke={BAND_STROKE[band]}
            strokeWidth="9"
            strokeLinecap="round"
            initial={{ strokeDasharray: `0 ${circumference}` }}
            animate={{ strokeDasharray: `${filled} ${circumference}` }}
            transition={{ duration: 1.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              "font-serif leading-none tabular-nums",
              on === "dark" ? "text-white" : "text-ink",
            )}
            style={{ fontSize: size * 0.3 }}
          >
            <CountUp to={score} duration={1.6} delay={0.15} immediate />
            {unit ? (
              <span className="align-top" style={{ fontSize: size * 0.14 }}>
                {unit}
              </span>
            ) : null}
          </span>
          <span
            className={cn(
              "mt-0.5 text-[10.5px] font-medium",
              on === "dark" ? "text-muted-dark" : "text-muted",
            )}
          >
            {BAND_LABEL[band]}
          </span>
        </div>
      </div>

      <figcaption className="text-center">
        <span
          className={cn(
            "block text-[12.5px] font-medium",
            on === "dark" ? "text-white" : "text-ink",
          )}
        >
          {label}
        </span>
        {caption ? (
          <span
            className={cn(
              "block text-[11.5px]",
              on === "dark" ? "text-muted-dark" : "text-muted",
            )}
          >
            {caption}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * The small before/after bar from PRD section 2 step 5: "ATS 64 → 88".
 *
 * Shows both values on one track so the size of the improvement is visible,
 * rather than two numbers the reader has to subtract.
 */
export function BeforeAfterBar({
  label,
  before,
  after,
  unit,
  className,
}: {
  label: string;
  before: number;
  after: number;
  unit?: string;
  className?: string;
}) {
  const from = clamp(Math.round(before), 0, 100);
  const to = clamp(Math.round(after), 0, 100);
  const improved = to >= from;
  const low = Math.min(from, to);
  const high = Math.max(from, to);

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[12px] font-medium text-ink">{label}</span>
        <span className="font-serif text-[15px] tabular-nums text-ink">
          {from}
          {unit}
          <span className="mx-1.5 text-muted" aria-hidden="true">
            →
          </span>
          {to}
          {unit}
          <span className="sr-only">
            {" "}
            {improved ? "improved to" : "fell to"} {to}
            {unit}
          </span>
        </span>
      </div>

      <div className="relative mt-2 h-2 w-full overflow-hidden rounded-full bg-ink/[0.07]">
        {/* The shared base up to the lower of the two values. */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-ink/25"
          style={{ width: `${low}%` }}
        />
        {/* The delta, coloured by direction. */}
        <motion.div
          className={cn(
            "absolute inset-y-0 rounded-full",
            improved ? "bg-[#4f9c76]" : "bg-[#cc6a53]",
          )}
          style={{ left: `${low}%` }}
          initial={{ width: "0%" }}
          animate={{ width: `${high - low}%` }}
          transition={{ duration: 1.3, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}
