"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { EASE_EDITORIAL } from "@/components/motion/primitives";
import { Check, Copy, ExternalLink } from "lucide-react";
import { ChainGlyph, TornPaperEdge, Wordmark } from "@/components/brand";
import { fetchStats } from "@/lib/chain/wallet";
import {
  ACTIVE_CHAIN,
  BRAND,
  CONTRACT_ADDRESS,
  EXPLORER_CONTRACT_URL,
  IS_CONTRACT_DEPLOYED,
} from "@/lib/config";
import { formatCount, shortAddress } from "@/lib/utils";

/**
 * The footer (PRD section 13).
 *
 * Required content: four link columns, two round badges, the contract address
 * with a copy control and an explorer link, a live stamp counter, the
 * independence disclaimer, and the layered torn-paper edge closing the page.
 *
 * The stamp counter reads `stats()` over the public RPC on mount. It is the one
 * live thing on an otherwise static page, so it degrades to simply not
 * rendering rather than showing a zero — a counter that says "0" when the RPC
 * is unreachable is worse than no counter.
 */

const COLUMNS = [
  {
    heading: "Product",
    links: [
      { href: "/app", label: "Check my CV" },
      { href: "/#sample", label: "Sample report" },
      { href: "/app/applications", label: "My applications" },
    ],
  },
  {
    heading: "Who it's for",
    links: [
      { href: "/#who", label: "Students" },
      { href: "/#who", label: "Graduates" },
      { href: "/#who", label: "Career changers" },
      { href: "/#who", label: "Tech roles" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { href: "/#faq", label: "What is an ATS?" },
      { href: "/#features", label: "CV tips" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/#how", label: "About" },
      { href: BRAND.githubUrl, label: "GitHub", external: true },
    ],
  },
] as const;

export function SiteFooter() {
  const [stamped, setStamped] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!IS_CONTRACT_DEPLOYED) return;
    let cancelled = false;

    void fetchStats().then((stats) => {
      if (!cancelled && stats) setStamped(stats.reports);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(CONTRACT_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Permission can be refused; the address is shown in full on hover.
    }
  };

  return (
    <footer className="section-light relative overflow-hidden border-t border-line">
      <div className="shell pb-6 pt-16">
        {/* ---------- Wordmark and link columns ---------- */}
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2.6fr]">
          <div>
            <Wordmark />
            <p className="mt-3 max-w-[30ch] text-[12.5px] leading-relaxed text-muted">
              Add your CV and a job. See how ATS-friendly your CV is, how well
              it matches, and exactly what to change.
            </p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((column) => (
              <div key={column.heading}>
                <h2 className="eyebrow mb-3">{column.heading}</h2>
                <ul className="flex flex-col gap-2">
                  {column.links.map((link) => (
                    <li key={`${column.heading}-${link.label}`}>
                      {"external" in link && link.external ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[12.5px] text-muted transition-colors hover:text-ink"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="text-[12.5px] text-muted transition-colors hover:text-ink"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* ---------- Badge row ---------- */}
        <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-line pt-8">
          {/* "Built on BOT Chain" */}
          <a
            href={BRAND.botChainUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-line bg-sand text-ink transition-colors group-hover:border-ink/40">
              <ChainGlyph className="text-[19px]" />
            </span>
            <span className="text-[12px] leading-tight">
              <span className="block font-medium text-ink">Built on BOT Chain</span>
              <span className="block text-muted">botchain.ai ↗</span>
            </span>
          </a>

          {/* "Verified on-chain" */}
          <div className="flex items-center gap-3">
            <span
              className="flex size-12 shrink-0 flex-col items-center justify-center rounded-full border border-line bg-mint text-mint-ink"
              aria-hidden="true"
            >
              <Check className="size-3.5" />
              <span className="text-[9.5px] font-semibold leading-none">
                {ACTIVE_CHAIN.chainId}
              </span>
            </span>
            <span className="text-[12px] leading-tight">
              <span className="block font-medium text-ink">Verified on-chain</span>
              <span className="block text-muted">
                Chain {ACTIVE_CHAIN.chainId} · {ACTIVE_CHAIN.name}
              </span>
            </span>
          </div>

          {/* Address, copy and explorer */}
          <div className="flex flex-wrap items-center gap-2">
            {IS_CONTRACT_DEPLOYED ? (
              <>
                <button
                  type="button"
                  onClick={() => void copyAddress()}
                  title={CONTRACT_ADDRESS}
                  className="inline-flex min-h-11 items-center gap-2 rounded-[4px] border border-line bg-sand px-2.5 font-mono text-[12px] text-ink transition-colors hover:border-ink/40 md:min-h-9"
                >
                  {shortAddress(CONTRACT_ADDRESS)}
                  {copied ? (
                    <Check className="size-3.5 text-mint-ink" aria-hidden="true" />
                  ) : (
                    <Copy className="size-3.5 text-muted" aria-hidden="true" />
                  )}
                  <span className="sr-only">
                    {copied ? "Address copied" : "Copy the contract address"}
                  </span>
                </button>

                <a
                  href={EXPLORER_CONTRACT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-[4px] bg-espresso-btn px-3 text-[12px] font-medium text-white transition-colors hover:bg-espresso md:min-h-9"
                >
                  View on explorer
                  <ExternalLink className="size-3" aria-hidden="true" />
                </a>
              </>
            ) : (
              <span className="rounded-[4px] bg-sand px-2.5 py-2 text-[11.5px] text-muted">
                Contract address published once deployed to {ACTIVE_CHAIN.name}
              </span>
            )}
          </div>

          {stamped !== null ? (
            <p className="text-[11.5px] text-muted" aria-live="polite">
              Reports stamped: {formatCount(stamped)}
            </p>
          ) : null}
        </div>

        {/* ---------- Disclaimer ---------- */}
        <p className="mt-8 max-w-[92ch] text-[11.5px] leading-relaxed text-muted">
          Callback is an independent project and is not affiliated with any job
          board or ATS vendor. Names of third-party products are used for
          compatibility purposes only and remain the trademarks of their
          respective owners. Scores are guidance, not a hiring guarantee. Your CV
          is never stored and never put on-chain.
        </p>

        {/* ---------- Bottom row ---------- */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-y-4 border-t border-line pt-6">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11.5px] text-muted">
            <span>© 2026 Callback. All rights reserved.</span>
            <Link href="/privacy" className="transition-colors hover:text-ink">
              Privacy Policy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-ink">
              Terms
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-script text-[20px] leading-none text-ink">
              Follow us
            </span>
            <a
              href={BRAND.xUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Callback on X"
              className="flex size-9 items-center justify-center rounded-full border border-line text-ink transition-colors hover:border-ink/40"
            >
              {/* X's glyph, drawn inline: it is not in the icon set in use. */}
              <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor" aria-hidden="true">
                <path d="M18.9 2H22l-7 8 7.6 12h-6.2l-4.8-7.6L5.6 22H2.5l7.4-8.4L2.6 2h6.3l4.5 7.1Zm-1.1 18h1.7L7.3 3.8H5.5Z" />
              </svg>
            </a>
            <a
              href={BRAND.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Callback on GitHub"
              className="flex size-9 items-center justify-center rounded-full border border-line text-ink transition-colors hover:border-ink/40"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
                <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.1-1.47-1.1-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.6 9.6 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* ---------- Oversized wordmark, rising into view ---------- */}
      <div className="pointer-events-none select-none overflow-hidden pb-6" aria-hidden="true">
        <motion.p
          initial={{ y: "70%", opacity: 0 }}
          whileInView={{ y: "0%", opacity: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1.4, ease: EASE_EDITORIAL }}
          className="text-center font-serif text-[clamp(5rem,21vw,19rem)] leading-[0.82] tracking-[-0.045em] text-ink/[0.07]"
        >
          Call<span className="italic">back</span>
        </motion.p>
      </div>

      {/* ---------- Torn paper edge ---------- */}
      <TornPaperEdge className="absolute inset-x-0 bottom-0" height={56} />
    </footer>
  );
}
