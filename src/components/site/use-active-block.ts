"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Which of a set of stacked blocks is currently the one in focus.
 *
 * Used by the two scroll-driven sections in PRD section 10: the sticky-scroll
 * "What it does" block, and the fading list of headings that brighten as they
 * reach the centre.
 *
 * Built on IntersectionObserver with a band across the middle of the viewport
 * rather than on a scroll listener doing getBoundingClientRect on every frame.
 * The observer fires only when a block actually crosses the band, which keeps
 * this off the main thread during scrolling.
 *
 * A single observer with a narrow root margin can leave no block intersecting
 * at all between two of them, which would flicker the active state off. So the
 * last known index is kept until another block claims it.
 */
export function useActiveBlock(count: number) {
  const [active, setActive] = useState(0);
  const refs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    const elements = refs.current.slice(0, count).filter((node): node is HTMLElement =>
      Boolean(node),
    );
    if (elements.length === 0) return;

    // Respect a reduced-motion preference by not driving anything from scroll:
    // the first block stays active and every block renders its own content.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Of everything currently in the band, take the one closest to the
        // centre. Scrolling fast can intersect two at once.
        const centre = window.innerHeight / 2;
        let best: { index: number; distance: number } | null = null;

        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = elements.indexOf(entry.target as HTMLElement);
          if (index === -1) continue;

          const box = entry.boundingClientRect;
          const distance = Math.abs(box.top + box.height / 2 - centre);
          if (!best || distance < best.distance) best = { index, distance };
        }

        if (best) setActive(best.index);
      },
      {
        // A band through the middle 40% of the viewport.
        rootMargin: "-30% 0px -30% 0px",
        threshold: 0,
      },
    );

    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [count]);

  const register = (index: number) => (node: HTMLElement | null) => {
    refs.current[index] = node;
  };

  return { active, register, setActive };
}
