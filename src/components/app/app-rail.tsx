"use client";

import { Link } from "@/i18n/link";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";
import { stripLocale } from "@/i18n/config";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { ClipboardList, FilePlus2, Home, ShieldCheck } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { WalletButton } from "@/components/app/wallet-button";
import { ACTIVE_CHAIN, IS_CONTRACT_DEPLOYED } from "@/lib/config";
import { cn } from "@/lib/utils";

/**
 * The app's navigation rail.
 *
 * One component serves both layouts from PRD sections 7 and 8: an espresso
 * side rail from 1024px up, and a compact top bar below that. Sharing the
 * component keeps the active-route logic and the wallet state in one place
 * rather than duplicating them per breakpoint.
 *
 * Split into a presentational half that takes `activeHref`, and a thin half
 * that reads the current path. With Cache Components enabled, `usePathname`
 * is runtime data and cannot be read in a prerendered shell — so the layout
 * renders the presentational half as the Suspense fallback, with no link
 * highlighted, and the live half takes over on the client. The rail is
 * therefore present in the first paint and never shifts.
 */

export function AppRail({ activeHref }: { activeHref: string | null }) {
  const r = useI18n().t.app.rail;
  const LINKS = [
    { href: "/app", label: r.newCheck, icon: FilePlus2 },
    { href: "/app/applications", label: r.applications, icon: ClipboardList },
  ];
  // The pathname carries the locale prefix (`/id/app`); the links do not.
  const current = activeHref === null ? null : stripLocale(activeHref);
  const isActive = (href: string) => {
    if (current === null) return false;
    return href === "/app" ? current === "/app" : current.startsWith(href);
  };

  return (
    <header
      className={cn(
        "grain z-20 shrink-0 bg-espresso text-white",
        // Top bar below lg, fixed side rail from lg up.
        "sticky top-0 lg:static lg:flex lg:h-dvh lg:w-[232px] lg:flex-col",
      )}
    >
      {/* ---------- Side rail (lg and up) ---------- */}
      <div className="relative z-[2] hidden h-full flex-col overflow-hidden p-5 lg:flex">
        <div
          className="glow-lilac pointer-events-none absolute -left-24 bottom-20 size-[340px] opacity-25 blur-2xl"
          aria-hidden="true"
        />
        <Wordmark on="dark" />

        <nav aria-label={r.label} className="mt-8 flex flex-col gap-1">
          {LINKS.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13px] font-medium transition-colors",
                  active ? "text-white" : "text-muted-dark hover:bg-white/[0.05] hover:text-white",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="rail-active"
                    className="absolute inset-0 rounded-[10px] bg-white/10 ring-1 ring-white/10"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    aria-hidden="true"
                  />
                ) : null}
                <Icon
                  className="relative size-4 shrink-0 transition-transform duration-300 group-hover:scale-110"
                  aria-hidden="true"
                />
                <span className="relative">{link.label}</span>
                {active ? (
                  <span className="relative ml-auto size-1.5 rounded-full bg-lilac" aria-hidden="true" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="relative mt-auto flex flex-col gap-4">
          <div className="rounded-[14px] border border-white/10 bg-white/[0.04] p-3.5">
            <p className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-medium text-white">
              <ShieldCheck className="size-3.5 text-lilac" aria-hidden="true" />
              {r.privateTitle}
            </p>
            <p className="text-[11px] leading-relaxed text-muted-dark">
              {IS_CONTRACT_DEPLOYED
                ? fmt(r.privateDeployed, { chain: ACTIVE_CHAIN.name })
                : r.privatePlain}
            </p>
          </div>

          <WalletButton on="dark" />

          <LanguageSwitcher on="dark" className="self-start" />

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[12px] text-muted-dark transition-colors hover:text-white"
          >
            <Home className="size-3.5" aria-hidden="true" />
            {r.back}
          </Link>
        </div>
      </div>

      {/* ---------- Top bar (below lg) ---------- */}
      <div className="relative z-[2] flex items-center justify-between gap-3 px-4 py-3 lg:hidden">
        <Wordmark on="dark" className="text-[17px]" />
        <div className="flex items-center gap-2">
          <LanguageSwitcher on="dark" />
          <WalletButton on="dark" compact />
        </div>
      </div>

      <nav
        aria-label={r.label}
        className="hide-scrollbar relative z-[2] flex gap-1 overflow-x-auto border-t border-white/10 px-2 lg:hidden"
      >
        {LINKS.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-[12.5px] font-medium transition-colors",
                active
                  ? "border-white text-white"
                  : "border-transparent text-muted-dark hover:text-white",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

/** Reads the current path and renders the rail with the right link active. */
export function AppRailLive() {
  return <AppRail activeHref={usePathname()} />;
}
