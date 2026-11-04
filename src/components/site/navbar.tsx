"use client";

import { useRef, useState } from "react";
import { Link } from "@/i18n/link";
import { useI18n } from "@/i18n/client";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
} from "motion/react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { EASE_EDITORIAL } from "@/components/motion/primitives";
import { cn } from "@/lib/utils";

/**
 * The site navbar (PRD section 10).
 *
 * Transparent over the espresso hero. Once the page scrolls it condenses into
 * a floating near-white pill, tucks away while the reader scrolls down, and
 * comes back the moment they scroll up — so it never covers content they are
 * reading but is always one flick away. A thin lilac bar along its bottom
 * edge shows reading progress.
 *
 * "Connect wallet" is a link into the app rather than a live wallet control.
 * Mounting the wallet provider here would pull ethers into the bundle of a
 * page most visitors will only read. The app's own rail has the real control.
 */

export function Navbar({ surface = "dark" }: { surface?: "dark" | "light" } = {}) {
  const { t } = useI18n();
  const n = t.site.nav;
  const LINKS = [
    { href: "/#features", label: n.links.features },
    { href: "/#who", label: n.links.who },
    { href: "/#how", label: n.links.how },
    { href: "/#faq", label: n.links.faq },
  ];

  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { scrollY, scrollYProgress } = useScroll();

  /**
   * Hide/show with hysteresis. Deciding per scroll event made the bar flicker:
   * trackpads and smooth scrolling deliver many tiny deltas, so it flipped on
   * every frame. Instead the bar only changes state once the page has moved
   * TRAVEL px in one direction since the last turning point.
   */
  const TRAVEL = 60;
  const hiddenRef = useRef(false);
  const anchorRef = useRef(0);

  useMotionValueEvent(scrollY, "change", (current) => {
    setScrolled(current > 24);

    const show = (value: boolean) => {
      if (hiddenRef.current === !value) return;
      hiddenRef.current = !value;
      setHidden(!value);
    };

    // Always visible near the top, and never hidden with the menu open.
    if (menuOpen || current < 420) {
      anchorRef.current = current;
      show(true);
      return;
    }

    if (hiddenRef.current) {
      // Scrolling down while hidden: keep the anchor at the lowest point seen.
      anchorRef.current = Math.max(anchorRef.current, current);
      if (current < anchorRef.current - TRAVEL) {
        anchorRef.current = current;
        show(true);
      }
    } else {
      // Visible: keep the anchor at the highest point seen.
      anchorRef.current = Math.min(anchorRef.current, current);
      if (current > anchorRef.current + TRAVEL) {
        anchorRef.current = current;
        show(false);
      }
    }
  });

  const dark = surface === "dark" && !scrolled && !menuOpen;

  return (
    <motion.header
      animate={{ y: hidden ? "-110%" : "0%" }}
      transition={{ duration: 0.45, ease: EASE_EDITORIAL }}
      className="sticky top-0 z-40 px-3 pt-3 md:px-5 md:pt-4"
    >
      <div
        className={cn(
          "relative mx-auto max-w-[1320px] overflow-hidden transition-[background-color,box-shadow,border-color,border-radius] duration-500",
          scrolled || menuOpen
            ? "rounded-[18px] border border-line/80 bg-cream/85 shadow-[0_18px_40px_-28px_rgba(28,16,9,0.45)] backdrop-blur-xl"
            : "rounded-[18px] border border-transparent bg-transparent",
        )}
      >
        <div className="flex h-16 items-center justify-between gap-6 px-4 md:h-[72px] md:px-7">
          <Wordmark on={dark ? "dark" : "light"} />

          <nav aria-label={n.label} className="hidden items-center gap-1.5 lg:flex">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "group relative rounded-full px-4 py-2.5 text-[14.5px] font-medium transition-colors",
                  dark
                    ? "text-white/70 hover:text-white"
                    : "text-muted hover:text-ink",
                )}
              >
                {link.label}
                <span
                  className={cn(
                    "absolute inset-x-4 bottom-1.5 h-px origin-left scale-x-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-x-100",
                    dark ? "bg-white/70" : "bg-ink/50",
                  )}
                  aria-hidden="true"
                />
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-5 lg:flex">
            <LanguageSwitcher on={dark ? "dark" : "light"} />
            <Link
              href="/app"
              className={cn(
                "text-[14.5px] font-medium transition-colors",
                dark ? "text-white/70 hover:text-white" : "text-muted hover:text-ink",
              )}
            >
              {n.connectWallet}
            </Link>
            <ButtonLink href="/app" on={dark ? "dark" : "light"} size="lg" className="group">
              {n.checkCv}
              <ArrowRight
                className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </ButtonLink>
          </div>

          {/* ---------- Mobile ---------- */}
          <div className="flex items-center gap-2 lg:hidden">
            <ButtonLink href="/app" on={dark ? "dark" : "light"} size="sm">
              {n.checkCv}
            </ButtonLink>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="site-menu"
              aria-label={menuOpen ? n.closeMenu : n.openMenu}
              className={cn(
                "inline-flex size-11 items-center justify-center rounded-full transition-colors",
                dark ? "text-white hover:bg-white/10" : "text-ink hover:bg-ink/[0.06]",
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={menuOpen ? "close" : "open"}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {menuOpen ? (
                    <X className="size-5" aria-hidden="true" />
                  ) : (
                    <Menu className="size-5" aria-hidden="true" />
                  )}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {menuOpen ? (
            <motion.nav
              id="site-menu"
              aria-label={n.label}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE_EDITORIAL }}
              className="overflow-hidden border-t border-line lg:hidden"
            >
              <ul className="flex flex-col px-4 py-2">
                {[...LINKS, { href: "/app", label: n.connectWallet }].map((link, index) => (
                  <motion.li
                    key={link.href + link.label}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + index * 0.04, ease: EASE_EDITORIAL }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="flex min-h-12 items-center justify-between font-serif text-[20px] text-ink"
                    >
                      {link.label}
                      <ArrowRight className="size-4 text-muted" aria-hidden="true" />
                    </Link>
                  </motion.li>
                ))}
              </ul>
              <div className="border-t border-line px-4 py-3">
                <LanguageSwitcher variant="list" />
              </div>
            </motion.nav>
          ) : null}
        </AnimatePresence>

        {/* Reading progress. */}
        {scrolled ? (
          <motion.span
            className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-lilac"
            style={{ scaleX: scrollYProgress }}
            aria-hidden="true"
          />
        ) : null}
      </div>
    </motion.header>
  );
}
