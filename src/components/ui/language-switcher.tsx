"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Globe } from "lucide-react";
import {
  LOCALES,
  LOCALE_COOKIE,
  LOCALE_NAMES,
  LOCALE_SHORT,
  localizeHref,
  stripLocale,
  type Locale,
} from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

/** Remember the choice for a year, so the proxy stops guessing. */
function rememberLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

const MENU_WIDTH = 208;
/** Header, three rows and padding. A little generous, so the flip happens early. */
const MENU_HEIGHT = 190;
const MENU_GAP = 8;
const SCREEN_EDGE = 12;

type MenuPlacement = {
  /** Open above the trigger instead of below it. */
  up: boolean;
  /** Line up with the trigger's right edge instead of its left. */
  end: boolean;
  style: { top?: number; bottom?: number; left?: number; right?: number };
};

/**
 * Where the menu goes, worked out from the room around the trigger.
 *
 * The same switcher sits top-right in the navbar and bottom-left in the app's
 * side rail. A menu that always opens downward and grows leftward fits the
 * first and is pushed off the screen in the second, so each axis is decided
 * on its own: flip upward when there is no room below, and anchor to the left
 * edge when there is no room to grow leftward.
 */
function placeMenu(rect: DOMRect): MenuPlacement {
  const spaceBelow = window.innerHeight - rect.bottom;
  const up = spaceBelow < MENU_HEIGHT + MENU_GAP + SCREEN_EDGE && rect.top > spaceBelow;
  const end = rect.right - MENU_WIDTH >= SCREEN_EDGE;

  return {
    up,
    end,
    style: {
      ...(up
        ? { bottom: window.innerHeight - rect.top + MENU_GAP }
        : { top: rect.bottom + MENU_GAP }),
      ...(end
        ? { right: Math.max(SCREEN_EDGE, window.innerWidth - rect.right) }
        : {
            left: Math.max(
              SCREEN_EDGE,
              Math.min(rect.left, window.innerWidth - MENU_WIDTH - SCREEN_EDGE),
            ),
          }),
    },
  };
}

const subscribeToNothing = () => () => {};
const isClient = () => true;
const isServer = () => false;

/** Inline flags instead of emoji: Windows shows flag emoji as letter pairs. */
function LocaleFlag({ locale, className }: { locale: Locale; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-3.5 w-[21px] shrink-0 overflow-hidden rounded-[2.5px] ring-1 ring-black/10",
        className,
      )}
      aria-hidden="true"
    >
      {locale === "en" ? (
        <svg viewBox="0 0 60 42" className="size-full" focusable="false">
          <rect width="60" height="42" fill="#012169" />
          <path d="M0 0 60 42M60 0 0 42" stroke="#fff" strokeWidth="9" />
          <path d="M0 0 60 42M60 0 0 42" stroke="#C8102E" strokeWidth="4.5" />
          <path d="M30 0v42M0 21h60" stroke="#fff" strokeWidth="14" />
          <path d="M30 0v42M0 21h60" stroke="#C8102E" strokeWidth="8" />
        </svg>
      ) : locale === "id" ? (
        <svg viewBox="0 0 60 42" className="size-full" focusable="false">
          <rect width="60" height="42" fill="#fff" />
          <rect width="60" height="21" fill="#CE1126" />
        </svg>
      ) : (
        <svg viewBox="0 0 60 42" className="size-full" focusable="false">
          <rect width="60" height="42" fill="#fff" />
          <g fill="#CC0001">
            <rect width="60" height="3" y="0" />
            <rect width="60" height="3" y="6" />
            <rect width="60" height="3" y="12" />
            <rect width="60" height="3" y="18" />
            <rect width="60" height="3" y="24" />
            <rect width="60" height="3" y="30" />
            <rect width="60" height="3" y="36" />
          </g>
          <rect width="30" height="21" fill="#010066" />
          <circle cx="11.5" cy="10.5" r="6.2" fill="#FFCC00" />
          <circle cx="14.1" cy="10.5" r="5.2" fill="#010066" />
          <polygon
            fill="#FFCC00"
            points="22.5,6.3 23.56,9.04 26.49,9.2 24.21,11.06 24.97,13.9 22.5,12.3 20.03,13.9 20.79,11.06 18.51,9.2 21.44,9.04"
          />
        </svg>
      )}
    </span>
  );
}

/**
 * Language picker.
 *
 * The target URL is worked out at click time from `window.location` rather
 * than from `usePathname`, which is runtime data under Cache Components and
 * would force a Suspense boundary around every header this sits in. The
 * choice goes into a cookie first: without it, the proxy would read an
 * Indonesian browser's Accept-Language and send someone who picked English
 * straight back to `/id`.
 *
 * The desktop menu renders in a portal, anchored to the trigger's right edge,
 * so it grows left instead of stretching the header and cannot be clipped by
 * the navbar's rounded, overflow-hidden shell.
 */
export function LanguageSwitcher({
  on = "light",
  variant = "compact",
  className,
}: {
  on?: "light" | "dark";
  /** `compact` opens a small anchored menu; `list` shows full names, for menus. */
  variant?: "compact" | "list";
  className?: string;
}) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const mounted = useSyncExternalStore(subscribeToNothing, isClient, isServer);
  const [placement, setPlacement] = useState<MenuPlacement>({
    up: false,
    end: true,
    style: { top: 0, right: 0 },
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const choose = (next: Locale) => {
    setOpen(false);
    if (next === locale) return;
    rememberLocale(next);
    const { pathname, search, hash } = window.location;
    router.push(`${localizeHref(stripLocale(pathname), next)}${search}${hash}`);
  };

  const toggle = () => {
    if (!open && triggerRef.current) {
      setPlacement(placeMenu(triggerRef.current.getBoundingClientRect()));
    }
    setOpen((value) => !value);
  };

  useEffect(() => {
    if (!open) return;

    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPlacement(placeMenu(rect));
    };

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onScroll = () => setOpen(false);

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  if (variant === "list") {
    return (
      <div className={cn("flex flex-wrap items-center gap-x-1 gap-y-1", className)}>
        <Globe
          className={cn("mr-1 size-3.5", on === "dark" ? "text-muted-dark" : "text-muted")}
          aria-hidden="true"
        />
        <span className="sr-only">{t.common.language}</span>
        {LOCALES.map((code, index) => (
          <span key={code} className="flex items-center">
            {index > 0 ? (
              <span
                className={cn("px-1", on === "dark" ? "text-white/25" : "text-line")}
                aria-hidden="true"
              >
                ·
              </span>
            ) : null}
            <button
              type="button"
              lang={code}
              onClick={() => choose(code)}
              aria-current={code === locale ? "true" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-1.5 px-1 text-[12px] transition-colors md:min-h-0",
                code === locale
                  ? on === "dark"
                    ? "font-medium text-white"
                    : "font-medium text-ink"
                  : on === "dark"
                    ? "text-muted-dark hover:text-white"
                    : "text-muted hover:text-ink",
              )}
            >
              <LocaleFlag locale={code} className="h-3 w-[18px]" />
              {LOCALE_NAMES[code]}
            </button>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        lang={locale}
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        title={LOCALE_NAMES[locale]}
        className={cn(
          "inline-flex h-11 items-center gap-2 rounded-full border px-2.5 text-[11px] font-semibold tracking-[0.05em] transition-colors md:h-9",
          on === "dark"
            ? "border-white/15 bg-white/[0.08] text-white hover:border-white/25 hover:bg-white/[0.14]"
            : "border-line bg-white/70 text-ink hover:border-ink/25 hover:bg-white",
        )}
      >
        <LocaleFlag locale={locale} />
        <span className="hidden min-[360px]:inline" aria-hidden="true">
          {LOCALE_SHORT[locale]}
        </span>
        <span className="sr-only">
          {t.common.language}: {LOCALE_NAMES[locale]}
        </span>
        <ChevronDown
          className={cn(
            "size-3 opacity-55 transition-transform duration-300",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {mounted
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <motion.div
                  ref={menuRef}
                  id={menuId}
                  role="menu"
                  aria-label={t.common.language}
                  initial={{ opacity: 0, y: placement.up ? 6 : -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: placement.up ? 4 : -4, scale: 0.99 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    position: "fixed",
                    ...placement.style,
                    width: MENU_WIDTH,
                    transformOrigin: `${placement.up ? "bottom" : "top"} ${placement.end ? "right" : "left"}`,
                  }}
                  className="z-[80] overflow-hidden rounded-2xl border border-line/80 bg-cream/95 p-1.5 shadow-[0_24px_60px_-24px_rgba(28,16,9,0.45)] backdrop-blur-xl"
                >
                  <p className="flex items-center gap-1.5 px-2 pb-1.5 pt-2 text-[9.5px] font-medium uppercase tracking-[0.18em] text-muted">
                    <Globe className="size-3" aria-hidden="true" />
                    {t.common.language}
                  </p>
                  {LOCALES.map((code) => {
                    const active = code === locale;
                    return (
                      <button
                        key={code}
                        type="button"
                        role="menuitemradio"
                        aria-checked={active}
                        lang={code}
                        onClick={() => choose(code)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors",
                          active ? "bg-ink/[0.055]" : "hover:bg-ink/[0.04]",
                        )}
                      >
                        <LocaleFlag locale={code} />
                        <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink">
                          {LOCALE_NAMES[code]}
                        </span>
                        <Check
                          className={cn(
                            "size-3.5 text-[#8a63d2]",
                            active ? "opacity-100" : "opacity-0",
                          )}
                          aria-hidden="true"
                        />
                      </button>
                    );
                  })}
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </div>
  );
}
