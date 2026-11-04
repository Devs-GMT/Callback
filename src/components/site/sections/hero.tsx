"use client";

import { useRef } from "react";
import Image from "next/image";
import { Link } from "@/i18n/link";
import { useI18n } from "@/i18n/client";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowRight, Check, PhoneIncoming } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import {
  CountUp,
  EASE_EDITORIAL,
  Magnetic,
  Marquee,
  SplitWords,
} from "@/components/motion/primitives";
import heroPhoto from "../../../../public/images/hero-callback.jpg";

/**
 * Section 1: the hero (PRD section 10).
 *
 * A large rounded photo card inside the espresso page — a job seeker taking
 * the call the product is named after — with the headline overlaid
 * bottom-left and hand-drawn UI lines that sketch themselves over the image.
 *
 * Motion, in order: the photo settles from a slight zoom, the headline rises
 * word by word, the sketch lines draw on, then two small product cards float
 * in over the photo. On scroll the photo drifts and scales gently behind the
 * text. Under reduced motion every element is simply in its final place.
 *
 * Below the tablet breakpoint the card goes full width and the text moves
 * beneath it (PRD section 8): at phone width there is no corner big enough to
 * hold a 40px headline and still show the photo.
 */

const FORMAT_MARKS = [
  "PDF",
  "Word",
  "Google Docs",
  "Notion",
  "Greenhouse",
  "Lever",
  "Workable",
  "Ashby",
] as const;

function FloatingCards() {
  const h = useI18n().t.site.hero;
  return (
    <>
      {/* "Incoming call" — the moment the product is named after. */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.9, delay: 1.5, ease: EASE_EDITORIAL }}
        className="absolute right-[5%] top-[9%] hidden md:block"
      >
        <div
          className="animate-float-slow flex items-center gap-3 rounded-full border border-white/15 bg-espresso/70 py-2 pl-2 pr-4 text-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.8)] backdrop-blur-md"
          style={{ ["--float-rotate" as string]: "-1deg" }}
        >
          <span className="relative flex size-9 items-center justify-center rounded-full bg-[#4f9c76]">
            <span className="animate-pulse-ring absolute inset-0 rounded-full bg-[#4f9c76]" />
            <PhoneIncoming className="animate-ring relative size-4" aria-hidden="true" />
          </span>
          <span className="leading-tight">
            <span className="block text-[12.5px] font-medium">{h.callFrom}</span>
            <span className="block text-[11px] text-muted-dark">{h.incoming}</span>
          </span>
        </div>
      </motion.div>

      {/* The re-check card, counting up. */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.9, delay: 1.8, ease: EASE_EDITORIAL }}
        className="absolute bottom-[10%] right-[5%] hidden w-[250px] lg:block"
      >
        <div
          className="animate-float-slower rounded-[var(--radius-card)] bg-white p-4 text-ink shadow-[0_30px_70px_-25px_rgba(0,0,0,0.75)]"
          style={{ ["--float-rotate" as string]: "1.2deg" }}
        >
          <div className="flex items-center justify-between">
            <p className="eyebrow">{h.jobMatch}</p>
            <span className="inline-flex items-center gap-1 rounded-[4px] bg-mint px-1.5 py-0.5 text-[10.5px] font-medium text-mint-ink">
              <Check className="size-3" aria-hidden="true" />
              {h.rechecked}
            </span>
          </div>
          <p className="mt-2 flex items-baseline gap-2 font-serif text-[34px] leading-none">
            <span className="text-[18px] text-muted line-through decoration-1">58%</span>
            <CountUp to={81} from={58} delay={2.3} duration={1.8} immediate suffix="%" />
          </p>
          <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-ink/[0.07]">
            <div className="absolute inset-y-0 left-0 w-[58%] rounded-full bg-ink/25" />
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-[#4f9c76]"
              initial={{ width: "58%" }}
              animate={{ width: "81%" }}
              transition={{ duration: 1.8, delay: 2.3, ease: EASE_EDITORIAL }}
            />
          </div>
          <p className="mt-2.5 text-[11px] text-muted">{h.rewritesNote}</p>
        </div>
      </motion.div>
    </>
  );
}

/** Faint UI sketch lines over the photo (PRD §10 §1), drawing themselves on. */
function SketchLines() {
  return (
    <svg
      viewBox="0 0 960 600"
      preserveAspectRatio="xMidYMid slice"
      className="sketch-draw pointer-events-none absolute inset-0 hidden h-full w-full md:block"
      aria-hidden="true"
    >
      <g className="sketch-stroke" opacity="0.7">
        <rect x="70" y="70" width="26" height="26" rx="4" style={{ ["--i" as string]: 0 }} />
        <path d="M75 84l7 8 13-16" strokeLinecap="round" style={{ ["--i" as string]: 1 }} />
        <path d="M110 83h120" strokeLinecap="round" style={{ ["--i" as string]: 2 }} />
        <rect x="70" y="112" width="26" height="26" rx="4" style={{ ["--i" as string]: 3 }} />
        <path d="M75 126l7 8 13-16" strokeLinecap="round" style={{ ["--i" as string]: 4 }} />
        <path d="M110 125h86" strokeLinecap="round" style={{ ["--i" as string]: 5 }} />
        <rect x="70" y="154" width="26" height="26" rx="4" style={{ ["--i" as string]: 6 }} />
        <path d="M110 167h104" strokeLinecap="round" style={{ ["--i" as string]: 7 }} />
        {/* A circled word, the way you'd mark up a printed CV. */}
        <path
          d="M612 300c40-18 132-16 150 6 14 18-36 36-98 34-58-2-92-20-52-40"
          strokeLinecap="round"
          style={{ ["--i" as string]: 6 }}
        />
      </g>
    </svg>
  );
}

export function Hero() {
  const h = useI18n().t.site.hero;
  const frameRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: frameRef,
    offset: ["start start", "end start"],
  });
  const photoY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const photoScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section className="section-dark relative -mt-[76px] overflow-hidden pb-8 pt-[100px] md:-mt-[88px] md:pt-[116px] md:pb-24">
      {/* A soft lilac bloom behind the card, so the espresso isn't flat. */}
      <div
        className="glow-lilac pointer-events-none absolute -right-40 -top-40 size-[640px] opacity-40 blur-2xl"
        aria-hidden="true"
      />

      <div className="shell relative">
        <motion.div
          ref={frameRef}
          initial={{ opacity: 0, y: 24, clipPath: "inset(6% 4% 6% 4% round 24px)" }}
          animate={{ opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0% round 24px)" }}
          transition={{ duration: 1.3, ease: EASE_EDITORIAL }}
          className="grain relative overflow-hidden rounded-[var(--radius-photo)] bg-espresso-card"
        >
          <div className="relative aspect-[4/3] w-full md:aspect-[16/8.4]">
            <motion.div
              className="absolute inset-0"
              style={reduce ? undefined : { y: photoY, scale: photoScale }}
            >
              <motion.div
                className="absolute inset-0"
                initial={{ scale: 1.14 }}
                animate={{ scale: 1 }}
                transition={{ duration: 2.2, ease: EASE_EDITORIAL }}
              >
                <Image
                  src={heroPhoto}
                  alt={h.photoAlt}
                  fill
                  preload
                  placeholder="blur"
                  sizes="(min-width: 1240px) 1180px, 100vw"
                  className="photo-warm object-cover object-[62%_30%]"
                />
              </motion.div>
            </motion.div>

            {/* Warm espresso wash, and the scrim the headline sits on. */}
            <div
              className="pointer-events-none absolute inset-0 bg-[#3b2416]/25 mix-blend-multiply"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute inset-0 hidden bg-gradient-to-tr from-espresso via-espresso/65 to-transparent md:block"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-espresso/70 to-transparent md:hidden"
              aria-hidden="true"
            />

            <SketchLines />
            <FloatingCards />
          </div>

          {/* ---------- Overlaid copy (md and up) ---------- */}
          <motion.div
            style={reduce ? undefined : { y: copyY, opacity: copyOpacity }}
            className="absolute inset-x-0 bottom-0 z-[2] hidden p-8 md:block lg:p-12"
          >
            <div className="max-w-[52ch]">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5, ease: EASE_EDITORIAL }}
              >
                <Link
                  href="/#sample"
                  className="group mb-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-espresso/50 py-1.5 pl-1.5 pr-3 text-[11.5px] text-white backdrop-blur transition-colors hover:border-white/60"
                >
                  <span className="rounded-full bg-lilac px-2 py-0.5 text-[10.5px] font-medium text-espresso">
                    {h.sampleTag}
                  </span>
                  {h.sampleLine}
                  <ArrowRight
                    className="size-3 transition-transform duration-300 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </motion.div>

              <SplitWords
                as="h1"
                text={h.title}
                accent={[h.titleAccent]}
                immediate
                delay={0.55}
                stagger={0.09}
                className="font-serif text-white text-[clamp(3rem,1.8rem+5vw,6rem)] leading-[0.98] tracking-[-0.025em]"
              />

              <motion.p
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 1.0, ease: EASE_EDITORIAL }}
                className="mt-5 max-w-[44ch] text-[15px] leading-relaxed text-white/75"
              >
                {h.lede}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 1.15, ease: EASE_EDITORIAL }}
                className="mt-8 flex flex-wrap items-center gap-3"
              >
                <Magnetic>
                  <ButtonLink href="/app" on="dark" size="lg" className="group">
                    {h.cta}
                    <ArrowRight
                      className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </ButtonLink>
                </Magnetic>
                <ButtonLink href="/#sample" tone="outline" on="dark" size="lg">
                  {h.sample}
                </ButtonLink>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>

        {/* ---------- Mobile: text below the card (PRD section 8) ---------- */}
        <div className="mt-8 md:hidden">
          <Link
            href="/#sample"
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 py-1 pl-1 pr-3 text-[11.5px] text-white"
          >
            <span className="rounded-full bg-lilac px-2 py-0.5 text-[10.5px] font-medium text-espresso">
              {h.sampleTagShort}
            </span>
            Alex: 58% → 81%
            <ArrowRight className="size-3" aria-hidden="true" />
          </Link>

          <SplitWords
            as="h1"
            text={h.title}
            accent={[h.titleAccent]}
            immediate
            delay={0.3}
            className="font-serif text-[3rem] leading-[1] tracking-[-0.02em] text-white"
          />

          <p className="mt-4 text-[14.5px] leading-relaxed text-muted-dark">
            {h.ledeShort}
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <ButtonLink href="/app" on="dark" size="lg" className="w-full">
              {h.cta}
            </ButtonLink>
            <ButtonLink
              href="/#sample"
              tone="outline"
              on="dark"
              size="lg"
              className="w-full"
            >
              {h.sample}
            </ButtonLink>
          </div>
        </div>

        {/* ---------- Format strip ----------
            Plain text marks in an endless row. The heading says "reads"
            rather than implying any partnership — the PRD is explicit. */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.4 }}
          className="mt-12 flex flex-col gap-4 border-t border-espresso-line pt-7 md:mt-14 md:flex-row md:items-center md:gap-10"
        >
          <p className="eyebrow eyebrow-on-dark shrink-0">{h.readsFrom}</p>
          <Marquee className="marquee-fade min-w-0 flex-1" duration={32}>
            {[...FORMAT_MARKS, h.careerPages].map((mark) => (
              <span
                key={mark}
                className="flex items-center gap-10 pr-10 font-serif text-[19px] italic text-white/55"
              >
                {mark}
                <span className="size-1 rounded-full bg-lilac/70" aria-hidden="true" />
              </span>
            ))}
          </Marquee>
        </motion.div>
      </div>
    </section>
  );
}
