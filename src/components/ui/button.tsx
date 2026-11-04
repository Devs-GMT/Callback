import { Link } from "@/i18n/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * PRD section 9: buttons are small rectangles with roughly a 4px radius.
 * On light sections the primary is espresso-filled with white text; on dark
 * sections it inverts to white-filled with espresso text. Text links such as
 * "Learn more" are small outlined buttons rather than underlined links.
 *
 * The `on` axis exists because the same button appears on both section
 * colours, and getting the contrast right matters more than having one
 * variant name per appearance.
 */
export type ButtonTone = "primary" | "outline" | "ghost";
export type ButtonSurface = "light" | "dark";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-[4px] font-medium " +
  "whitespace-nowrap transition-[color,background-color,border-color,transform,box-shadow] duration-200 " +
  "active:scale-[0.97] motion-reduce:active:scale-100 " +
  "disabled:pointer-events-none disabled:opacity-45 " +
  // PRD section 8 asks for touch targets of at least 44px. Enforced by giving
  // every button a 44px minimum below the tablet breakpoint and letting it
  // settle to its designed height on pointer-driven screens.
  "min-h-11 md:min-h-0";

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[12.5px]",
  md: "h-10 px-4 text-[13.5px]",
  lg: "h-11 px-5 text-[14px]",
};

const TONES: Record<ButtonSurface, Record<ButtonTone, string>> = {
  light: {
    primary: "bg-espresso-btn text-white hover:bg-espresso focus-visible:bg-espresso",
    outline:
      "border border-ink/25 text-ink hover:border-ink/60 hover:bg-ink/[0.04]",
    ghost: "text-muted hover:text-ink hover:bg-ink/[0.04]",
  },
  dark: {
    primary: "bg-white text-espresso-btn hover:bg-white/88",
    outline:
      "border border-white/30 text-white hover:border-white/70 hover:bg-white/10",
    ghost: "text-muted-dark hover:text-white hover:bg-white/10",
  },
};

type SharedProps = {
  tone?: ButtonTone;
  on?: ButtonSurface;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
};

export function buttonClasses({
  tone = "primary",
  on = "light",
  size = "md",
  className,
}: Omit<SharedProps, "children">) {
  return cn(BASE, SIZES[size], TONES[on][tone], className);
}

export type ButtonProps = SharedProps &
  Omit<ComponentPropsWithoutRef<"button">, "className" | "children">;

export function Button({ tone, on, size, className, children, ...props }: ButtonProps) {
  return (
    <button className={buttonClasses({ tone, on, size, className })} {...props}>
      {children}
    </button>
  );
}

export type ButtonLinkProps = SharedProps & {
  href: string;
  /** Opens in a new tab with the rel attributes that implies. */
  external?: boolean;
} & Omit<ComponentPropsWithoutRef<"a">, "className" | "children" | "href">;

export function ButtonLink({
  href,
  external,
  tone,
  on,
  size,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  const classes = buttonClasses({ tone, on, size, className });

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} {...props}>
      {children}
    </Link>
  );
}
