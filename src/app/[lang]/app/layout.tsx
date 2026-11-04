import { Suspense } from "react";
import type { Metadata } from "next";
import { WalletProvider } from "@/components/app/wallet-context";
import { AppRail, AppRailLive } from "@/components/app/app-rail";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t.meta.appTitle,
    description: t.meta.appDescription,
    // The app is a private workspace over local data; there is nothing here for
    // a search engine to index, and a shared report link carries no CV content.
    robots: { index: false, follow: true },
  };
}

/**
 * The app shell (PRD section 7).
 *
 * Desktop gets an espresso left rail holding navigation and the wallet, with
 * the work area on the near-white page beside it. Below 1024px the rail
 * becomes a compact top bar, because at that width a fixed side rail costs
 * more horizontal space than the two input cards can spare.
 */
export default function AppLayout({ children }: LayoutProps<"/[lang]/app">) {
  return (
    <WalletProvider>
      <div className="flex min-h-dvh flex-col bg-cream lg:flex-row">
        {/* The fallback is the same rail with nothing highlighted, so the
            prerendered shell already has it and the only thing that arrives
            later is the active-link state. */}
        <Suspense fallback={<AppRail activeHref={null} />}>
          <AppRailLive />
        </Suspense>
        <main className="paper-dots relative min-w-0 flex-1 pb-20 lg:h-dvh lg:overflow-y-auto lg:pb-0">
          {children}
        </main>
      </div>
    </WalletProvider>
  );
}
