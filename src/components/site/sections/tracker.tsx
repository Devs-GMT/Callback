"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { ChainGlyph } from "@/components/brand";
import {
  EASE_EDITORIAL,
  Reveal,
  SplitWords,
  Stagger,
  StaggerItem,
} from "@/components/motion/primitives";
import { ACTIVE_CHAIN } from "@/lib/config";
import { cn } from "@/lib/utils";

/**
 * Section 7: your application tracker (PRD section 10).
 *
 * Three soft cards, each with a small live illustration of what it holds. The
 * third one has to do real work: it is where a visitor who has never heard of
 * BOT Chain finds out what stamping is, and that it is optional and carries no
 * personal data. So it names exactly what goes on chain.
 */

const STATUSES = [
  { label: "Not applied", className: "bg-ink/[0.06] text-muted" },
  { label: "Applied", className: "bg-lilac-soft text-[#5b3d99]" },
  { label: "Interview", className: "bg-yellow text-yellow-ink" },
  { label: "Offer", className: "bg-peach text-coral-ink" },
  { label: "📞 Callback!", className: "bg-mint text-mint-ink" },
] as const;

function StatusCycle() {
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const timer = setInterval(() => setIndex((value) => (value + 1) % STATUSES.length), 1600);
    return () => clearInterval(timer);
  }, [reduce]);

  const rows = [
    { role: "Product Analyst", company: "Acme", score: 81 },
    { role: "Data Analyst", company: "Northwind", score: 74 },
    { role: "BI Developer", company: "Globex", score: 66 },
  ];

  return (
    <ul className="flex flex-col gap-2" aria-hidden="true">
      {rows.map((row, rowIndex) => {
        const status = STATUSES[(index + rowIndex * 2) % STATUSES.length];
        return (
          <li
            key={row.role}
            className="flex items-center justify-between gap-3 rounded-[10px] bg-white px-3 py-2.5"
          >
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-medium text-ink">{row.role}</span>
              <span className="block text-[10.5px] text-muted">
                {row.company} · {row.score}%
              </span>
            </span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={status.label}
                initial={{ opacity: 0, y: 8, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.9 }}
                transition={{ duration: 0.35, ease: EASE_EDITORIAL }}
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-medium",
                  status.className,
                )}
              >
                {status.label}
              </motion.span>
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}

function BeforeAfterMini() {
  return (
    <div className="flex flex-col gap-3 rounded-[10px] bg-white p-3.5" aria-hidden="true">
      {[
        { label: "ATS", from: 64, to: 88 },
        { label: "Match", from: 58, to: 81 },
      ].map((row, index) => (
        <div key={row.label}>
          <div className="mb-1.5 flex justify-between text-[11px]">
            <span className="font-medium text-ink">{row.label}</span>
            <span className="tabular-nums text-muted">
              {row.from} → <span className="text-ink">{row.to}</span>
            </span>
          </div>
          <div className="relative h-1.5 overflow-hidden rounded-full bg-ink/[0.07]">
            <div className="absolute inset-y-0 left-0 rounded-full bg-ink/25" style={{ width: `${row.from}%` }} />
            <motion.div
              className="absolute inset-y-0 rounded-full bg-[#4f9c76]"
              style={{ left: `${row.from}%` }}
              initial={{ width: 0 }}
              whileInView={{ width: `${row.to - row.from}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: 0.3 + index * 0.2, ease: EASE_EDITORIAL }}
            />
          </div>
        </div>
      ))}
      <div className="mt-1 rounded-[6px] bg-mint/30 px-2.5 py-2 text-[11px] leading-snug text-ink">
        <span className="text-mint-ink">+ </span>Built weekly <b className="font-medium">SQL</b> reports for 4 teams
      </div>
    </div>
  );
}

function StampSeal() {
  return (
    <div className="relative mx-auto flex size-[150px] items-center justify-center" aria-hidden="true">
      <svg viewBox="0 0 150 150" className="animate-spin-slow absolute inset-0 size-full text-ink/55">
        <defs>
          <path id="seal-circle" d="M75 75m-58 0a58 58 0 1 1 116 0a58 58 0 1 1-116 0" />
        </defs>
        <text className="fill-current text-[10.5px] uppercase tracking-[0.32em]">
          <textPath href="#seal-circle">
            Stamped on {ACTIVE_CHAIN.name} · no personal data ·
          </textPath>
        </text>
      </svg>
      <motion.span
        initial={{ scale: 1.6, opacity: 0, rotate: -20 }}
        whileInView={{ scale: 1, opacity: 1, rotate: -8 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.3 }}
        className="flex size-[78px] items-center justify-center rounded-full border-2 border-dashed border-ink/40 bg-white text-ink"
      >
        <ChainGlyph className="text-[30px]" />
      </motion.span>
    </div>
  );
}

const CARDS = [
  {
    title: "Match history",
    body: "Every job you checked, with its ATS score, its match percentage and the date. Saved in your browser, not on a server.",
    visual: <StatusCycle />,
    span: "md:col-span-2 lg:col-span-1",
    surface: "bg-sand",
  },
  {
    title: "Before / after",
    body: "See every change you accepted, the bullet it replaced, and what the re-check did to both scores.",
    visual: <BeforeAfterMini />,
    span: "",
    surface: "bg-sand",
  },
  {
    title: "Proof on BOT Chain",
    body: `Optionally stamp a report on ${ACTIVE_CHAIN.name}. Two salted hashes, two scores, the job title and a date — no name, no email, no CV text.`,
    visual: <StampSeal />,
    detail: "Needs a wallet. Nothing else here does.",
    span: "",
    surface: "bg-stone/70",
  },
];

export function Tracker() {
  return (
    <section className="section-light pb-20 md:pb-32">
      <div className="shell">
        <div className="max-w-[46ch]">
          <Reveal>
            <p className="eyebrow mb-4">Your application tracker</p>
          </Reveal>
          <SplitWords
            text="Keep every application in one place."
            accent={["one"]}
            accentClassName="italic text-[#8a63d2]"
            className="display-2 font-serif text-ink"
          />
        </div>

        <Stagger as="ul" gap={0.12} className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((card) => (
            <StaggerItem as="li" key={card.title} className={card.span}>
              <article
                className={cn(
                  "group flex h-full flex-col rounded-[22px] p-6 transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-[0_30px_60px_-36px_rgba(28,16,9,0.5)]",
                  card.surface,
                )}
              >
                <div className="mb-6 flex min-h-[170px] flex-col justify-center">{card.visual}</div>
                <h3 className="font-serif text-[23px] leading-snug text-ink">{card.title}</h3>
                <p className="mt-2.5 flex-1 text-[13px] leading-relaxed text-muted">{card.body}</p>
                {card.detail ? (
                  <p className="mt-5 border-t border-ink/10 pt-4 text-[11.5px] leading-relaxed text-muted">
                    {card.detail}
                  </p>
                ) : null}
              </article>
            </StaggerItem>
          ))}
        </Stagger>

        <Reveal delay={0.2}>
          <p className="mt-7 text-[12.5px] text-muted">
            <Link
              href="/app/applications"
              className="group inline-flex items-center gap-1 font-medium text-ink underline decoration-line underline-offset-4 transition-colors hover:decoration-ink"
            >
              Open my applications
              <ArrowUpRight
                className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>{" "}
            — or delete everything in one click, any time.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
