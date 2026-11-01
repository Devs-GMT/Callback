import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The card surfaces from PRD section 9.
 *
 * On light sections: white or soft sand (#F7F5F4) with a hairline. On espresso
 * sections: a slightly lighter brown than the background, with a faint white
 * hairline. Radius comes from the token scale — card radius is deliberately
 * much smaller than the big photo and panel radii, so corner size keeps
 * signalling hierarchy instead of being a uniform "rounded" default.
 */

export type CardSurface = "white" | "sand" | "stone" | "espresso" | "espresso-raised";

const SURFACES: Record<CardSurface, string> = {
  white: "bg-white border border-line text-ink",
  sand: "bg-sand border border-line text-ink",
  stone: "bg-stone border border-[#d9cfc7] text-ink",
  espresso: "bg-espresso-card border border-white/8 text-white",
  "espresso-raised": "bg-espresso-card-raised border border-white/10 text-white",
};

export type CardProps<T extends ElementType = "div"> = {
  as?: T;
  surface?: CardSurface;
  /** Removes the default padding, for cards that manage their own sections. */
  bare?: boolean;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

export function Card<T extends ElementType = "div">({
  as,
  surface = "white",
  bare,
  className,
  children,
  ...props
}: CardProps<T>) {
  const Component = (as ?? "div") as ElementType;

  return (
    <Component
      className={cn(
        "rounded-[var(--radius-card)]",
        SURFACES[surface],
        bare ? undefined : "p-5",
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

/* -------------------------------------------------------------------------- */

/** A tiny grey label above a section's text, per the PRD type rules. */
export function Eyebrow({
  children,
  on = "light",
  className,
}: {
  children: ReactNode;
  on?: "light" | "dark";
  className?: string;
}) {
  return (
    <p className={cn("eyebrow", on === "dark" && "eyebrow-on-dark", className)}>
      {children}
    </p>
  );
}

/**
 * A card header with an eyebrow, a serif title and optional trailing content.
 */
export function CardHeader({
  eyebrow,
  title,
  description,
  trailing,
  on = "light",
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
  on?: "light" | "dark";
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <Eyebrow on={on} className="mb-2">
            {eyebrow}
          </Eyebrow>
        ) : null}
        <h2
          className={cn(
            "font-serif text-[19px] leading-snug",
            on === "dark" ? "text-white" : "text-ink",
          )}
        >
          {title}
        </h2>
        {description ? (
          <p
            className={cn(
              "mt-1.5 text-[13px] leading-relaxed",
              on === "dark" ? "text-muted-dark" : "text-muted",
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}
