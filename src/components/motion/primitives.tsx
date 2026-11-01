"use client";

import {
  animate,
  motion,
  MotionConfig,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type HTMLMotionProps,
  type MotionValue,
} from "motion/react";
import {
  Children,
  useEffect,
  useRef,

  type ElementType,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/**
 * The motion vocabulary shared by the site and the app.
 *
 * Every primitive here animates transform and opacity only, so nothing causes
 * layout work while scrolling, and every one collapses to its final state
 * under `prefers-reduced-motion` — via `MotionProvider`'s `reducedMotion="user"`
 * for the declarative ones, and an explicit check for the imperative ones.
 */

export const EASE_EDITORIAL = [0.22, 1, 0.36, 1] as const;

export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/* -------------------------------------------------------------------------- */
/* Reveal: fade and rise once, when scrolled into view                        */
/* -------------------------------------------------------------------------- */

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Distance travelled, in px. Negative values come from above. */
  y?: number;
  x?: number;
  /** Start slightly smaller, for cards and images. */
  scale?: number;
  blur?: boolean;
  as?: "div" | "li" | "section" | "article" | "span" | "p" | "figure";
  amount?: number;
} & Omit<HTMLMotionProps<"div">, "children" | "className">;

export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
  x = 0,
  scale = 1,
  blur = false,
  as = "div",
  amount = 0.25,
  ...rest
}: RevealProps) {
  const Component = motion[as] as typeof motion.div;
  return (
    <Component
      className={className}
      initial={{
        opacity: 0,
        y,
        x,
        scale,
        filter: blur ? "blur(8px)" : "blur(0px)",
      }}
      whileInView={{ opacity: 1, y: 0, x: 0, scale: 1, filter: "blur(0px)" }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.9, delay, ease: EASE_EDITORIAL }}
      {...rest}
    >
      {children}
    </Component>
  );
}

/* -------------------------------------------------------------------------- */
/* Stagger: children reveal one after another                                 */
/* -------------------------------------------------------------------------- */

export function Stagger({
  children,
  className,
  gap = 0.08,
  delay = 0,
  as = "div",
  amount = 0.2,
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
  delay?: number;
  as?: "div" | "ul" | "ol";
  amount?: number;
}) {
  const Component = motion[as] as typeof motion.div;
  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount }}
      variants={{
        hidden: {},
        shown: { transition: { staggerChildren: gap, delayChildren: delay } },
      }}
    >
      {children}
    </Component>
  );
}

export function StaggerItem({
  children,
  className,
  as = "div",
  y = 24,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li" | "article";
  y?: number;
} & Omit<HTMLMotionProps<"div">, "children" | "className">) {
  const Component = motion[as] as typeof motion.div;
  return (
    <Component
      className={className}
      variants={{
        hidden: { opacity: 0, y },
        shown: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.8, ease: EASE_EDITORIAL },
        },
      }}
      {...rest}
    >
      {children}
    </Component>
  );
}

/* -------------------------------------------------------------------------- */
/* SplitWords: a headline that rises word by word out of a mask               */
/* -------------------------------------------------------------------------- */

/**
 * The full sentence is kept as the accessible name of the heading, and the
 * animated word spans are hidden from assistive technology, so a screen
 * reader hears one phrase rather than a dozen fragments.
 */
export function SplitWords({
  text,
  as = "h2",
  className,
  delay = 0,
  stagger = 0.06,
  /** Animate on mount rather than on scroll, for above-the-fold headlines. */
  immediate = false,
  /** Words (exact match) rendered in the italic accent style. */
  accent = [],
  accentClassName = "italic text-lilac",
}: {
  text: string;
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
  delay?: number;
  stagger?: number;
  immediate?: boolean;
  accent?: string[];
  accentClassName?: string;
}) {
  const Component = as as ElementType;
  const words = text.split(" ");
  const bare = (word: string) => word.replace(/[.,!?;:’‘'"]/g, "");
  const accented = new Set(accent.map(bare));

  const trigger = immediate
    ? { animate: "shown" as const }
    : {
        whileInView: "shown" as const,
        viewport: { once: true, amount: 0.6 },
      };

  return (
    <Component className={className} aria-label={text}>
      <motion.span
        aria-hidden="true"
        className="inline"
        initial="hidden"
        {...trigger}
        variants={{
          hidden: {},
          shown: { transition: { staggerChildren: stagger, delayChildren: delay } },
        }}
      >
        {words.map((word, index) => (
          <span
            key={`${word}-${index}`}
            // Padding and a matching negative margin give descenders room
            // inside the clipping mask without changing the line height.
            className="inline-block overflow-hidden whitespace-nowrap pb-[0.12em] -mb-[0.12em] align-bottom"
          >
            <motion.span
              className={cn(
                "inline-block",
                accented.has(bare(word)) && accentClassName,
              )}
              variants={{
                hidden: { y: "110%", rotate: 4 },
                shown: {
                  y: "0%",
                  rotate: 0,
                  transition: { duration: 0.95, ease: EASE_EDITORIAL },
                },
              }}
            >
              {word}
            </motion.span>
            {index < words.length - 1 ? " " : null}
          </span>
        ))}
      </motion.span>
    </Component>
  );
}

/* -------------------------------------------------------------------------- */
/* CountUp: a number that counts up when it scrolls into view                 */
/* -------------------------------------------------------------------------- */

export function CountUp({
  to,
  from = 0,
  duration = 1.6,
  delay = 0,
  className,
  suffix,
  /** Count on mount rather than on scroll. */
  immediate = false,
}: {
  to: number;
  from?: number;
  duration?: number;
  delay?: number;
  className?: string;
  suffix?: ReactNode;
  immediate?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  // The number is written straight from a motion value, so counting never
  // re-renders React on every frame.
  const value = useMotionValue(from);
  const rounded = useTransform(value, (latest) => Math.round(latest));

  useEffect(() => {
    if (reduce || !(inView || immediate)) return;
    const controls = animate(value, to, { duration, delay, ease: EASE_EDITORIAL });
    return () => controls.stop();
  }, [inView, immediate, reduce, value, to, duration, delay]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {reduce ? to : <motion.span>{rounded}</motion.span>}
      {suffix}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Parallax: drift an element against the scroll                              */
/* -------------------------------------------------------------------------- */

export function Parallax({
  children,
  className,
  offset = 60,
}: {
  children: ReactNode;
  className?: string;
  /** Total travel in px across the element's pass through the viewport. */
  offset?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [offset, -offset]);

  return (
    <motion.div ref={ref} className={className} style={{ y: reduce ? 0 : y }}>
      {children}
    </motion.div>
  );
}

/** Scroll progress of an element through the viewport, smoothed. */
export function useSectionProgress(
  offset: ["start end", "end start"] | ["start start", "end end"] | ["start end", "end end"] = [
    "start end",
    "end start",
  ],
) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset });
  const smooth = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });
  return { ref, progress: smooth as MotionValue<number> };
}

/* -------------------------------------------------------------------------- */
/* Tilt: a card that leans toward the pointer                                 */
/* -------------------------------------------------------------------------- */

export function Tilt({
  children,
  className,
  max = 6,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const reduce = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const springX = useSpring(rx, { stiffness: 160, damping: 18 });
  const springY = useSpring(ry, { stiffness: 160, damping: 18 });

  return (
    <motion.div
      className={className}
      style={{ rotateX: springX, rotateY: springY, transformPerspective: 900 }}
      onPointerMove={(event) => {
        if (reduce || event.pointerType !== "mouse") return;
        const box = event.currentTarget.getBoundingClientRect();
        const px = (event.clientX - box.left) / box.width - 0.5;
        const py = (event.clientY - box.top) / box.height - 0.5;
        ry.set(px * max * 2);
        rx.set(-py * max * 2);
      }}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/* Magnetic: a CTA that is pulled slightly toward the pointer                 */
/* -------------------------------------------------------------------------- */

export function Magnetic({
  children,
  className,
  strength = 0.25,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const reduce = useReducedMotion();
  const x = useSpring(0, { stiffness: 220, damping: 15, mass: 0.3 });
  const y = useSpring(0, { stiffness: 220, damping: 15, mass: 0.3 });

  return (
    <motion.div
      className={cn("inline-flex", className)}
      style={{ x, y }}
      onPointerMove={(event) => {
        if (reduce || event.pointerType !== "mouse") return;
        const box = event.currentTarget.getBoundingClientRect();
        x.set((event.clientX - (box.left + box.width / 2)) * strength);
        y.set((event.clientY - (box.top + box.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/* Marquee: an endless, pausable row                                          */
/* -------------------------------------------------------------------------- */

/**
 * CSS-driven rather than JS-driven: the row is duplicated once and translated
 * by half its width, so the loop is seamless and runs on the compositor. It
 * pauses on hover and stops entirely under reduced motion (see globals.css).
 */
export function Marquee({
  children,
  className,
  duration = 38,
  reverse = false,
}: {
  children: ReactNode;
  className?: string;
  duration?: number;
  reverse?: boolean;
}) {
  const items = Children.toArray(children);
  return (
    <div
      className={cn("marquee group relative flex overflow-hidden", className)}
      style={{ ["--marquee-duration" as string]: `${duration}s` }}
    >
      {[0, 1].map((copy) => (
        <div
          key={copy}
          aria-hidden={copy === 1 ? "true" : undefined}
          className={cn(
            "marquee-track flex shrink-0 items-center",
            reverse && "[animation-direction:reverse]",
          )}
        >
          {items}
        </div>
      ))}
    </div>
  );
}
