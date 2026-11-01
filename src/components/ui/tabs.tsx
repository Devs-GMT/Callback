"use client";

import { useCallback, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Tabs for the CV/job input cards and the report's five views.
 *
 * Follows the ARIA tabs pattern properly, because the report's tabs are the
 * main way through the content and a keyboard user should not be stuck:
 * one tab stop for the whole list, arrow keys to move between tabs, Home and
 * End to jump, and the panel associated with its tab.
 *
 * On narrow screens the list becomes a horizontal scrolling chip row, which is
 * what PRD section 8 asks for on mobile.
 */

export type TabItem<T extends string> = {
  id: T;
  label: ReactNode;
  /** Shown after the label, e.g. a count or a status glyph. */
  badge?: ReactNode;
  disabled?: boolean;
};

export type TabsProps<T extends string> = {
  items: readonly TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the tab list. */
  label: string;
  /**
   * Shared id prefix linking each tab to its panel. It has to come from the
   * caller rather than a `useId` inside this component, because `TabPanel` is
   * rendered as a sibling and needs the same prefix to build the matching
   * `aria-labelledby`. `useTabs` below supplies it.
   */
  idBase: string;
  on?: "light" | "dark";
  className?: string;
};

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
  idBase,
  on = "light",
  className,
}: TabsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);

  const move = useCallback(
    (direction: 1 | -1 | "first" | "last") => {
      const enabled = items.filter((item) => !item.disabled);
      if (enabled.length === 0) return;

      let next: TabItem<T>;
      if (direction === "first") {
        next = enabled[0];
      } else if (direction === "last") {
        next = enabled[enabled.length - 1];
      } else {
        const index = enabled.findIndex((item) => item.id === value);
        // Wrap around, which is what the ARIA pattern expects of arrow keys.
        const target = (index + direction + enabled.length) % enabled.length;
        next = enabled[target];
      }

      onChange(next.id);
      // Follow focus to the newly selected tab, per the automatic-activation
      // variant of the pattern.
      listRef.current
        ?.querySelector<HTMLButtonElement>(`[data-tab-id="${next.id}"]`)
        ?.focus();
    },
    [items, onChange, value],
  );

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      className={cn(
        "hide-scrollbar flex gap-1 overflow-x-auto",
        on === "light" ? "border-b border-line" : "border-b border-white/10",
        className,
      )}
      onKeyDown={(event) => {
        switch (event.key) {
          case "ArrowRight":
          case "ArrowDown":
            event.preventDefault();
            move(1);
            break;
          case "ArrowLeft":
          case "ArrowUp":
            event.preventDefault();
            move(-1);
            break;
          case "Home":
            event.preventDefault();
            move("first");
            break;
          case "End":
            event.preventDefault();
            move("last");
            break;
          default:
            break;
        }
      }}
    >
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            data-tab-id={item.id}
            id={`${idBase}-tab-${item.id}`}
            aria-selected={selected}
            aria-controls={`${idBase}-panel-${item.id}`}
            // Roving tabindex: only the selected tab is in the tab order.
            tabIndex={selected ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onChange(item.id)}
            className={cn(
              "relative -mb-px inline-flex min-h-11 shrink-0 items-center gap-2 px-3 pb-2.5 pt-2",
              "text-[13px] font-medium whitespace-nowrap transition-colors md:min-h-0",
              "disabled:pointer-events-none disabled:opacity-40",
              selected
                ? on === "light"
                  ? "text-ink"
                  : "text-white"
                : on === "light"
                  ? "text-muted hover:text-ink"
                  : "text-muted-dark hover:text-white",
            )}
          >
            {/* One indicator per tab list, sliding between tabs. */}
            {selected ? (
              <motion.span
                layoutId={`${idBase}-indicator`}
                className={cn(
                  "absolute inset-x-0 bottom-0 h-0.5 rounded-full",
                  on === "light" ? "bg-espresso" : "bg-white",
                )}
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
                aria-hidden="true"
              />
            ) : null}
            {item.label}
            {item.badge ? <span className="shrink-0">{item.badge}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The panel for a tab.
 *
 * Only the selected panel is rendered, so the five report views are not all
 * mounted at once. That is a deliberate trade: it costs a remount when
 * switching tabs, and saves rendering four views the user is not looking at —
 * including the requirements table, which can run to twenty rows.
 */
export function TabPanel({
  id,
  idBase,
  children,
  className,
}: {
  id: string;
  /** The same prefix passed to the owning `Tabs`. */
  idBase: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      role="tabpanel"
      id={`${idBase}-panel-${id}`}
      aria-labelledby={`${idBase}-tab-${id}`}
      tabIndex={0}
      // Panels mount per tab, so this plays on every switch.
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn("focus-visible:outline-none", className)}
    >
      {children}
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * State and ids for a tab set.
 *
 * Returns everything both halves need, so a caller cannot accidentally pair a
 * tab list with panels built from a different id prefix.
 */
export function useTabs<T extends string>(initial: T) {
  const idBase = useId();
  const [value, setValue] = useState<T>(initial);
  return { idBase, value, setValue };
}
