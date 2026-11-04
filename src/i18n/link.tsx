"use client";

import NextLink from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { localizeHref } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

/**
 * `next/link` that keeps the reader in their language: an internal href such
 * as `/app` becomes `/id/app` on an Indonesian page. Server components can
 * render it too; it only needs the provider above it.
 */
export function Link({ href, ...props }: ComponentProps<typeof NextLink>) {
  const { locale } = useI18n();
  const localized = typeof href === "string" ? localizeHref(href, locale) : href;
  return <NextLink href={localized} {...props} />;
}

/** The same rewrite for places that build an href by hand. */
export function useLocalizedHref() {
  const { locale } = useI18n();
  return (href: string) => localizeHref(href, locale);
}

/** The wordmark's link home, named in the reader's language. */
export function HomeLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <Link href={href} className={className} aria-label={t.site.nav.home}>
      {children}
    </Link>
  );
}
