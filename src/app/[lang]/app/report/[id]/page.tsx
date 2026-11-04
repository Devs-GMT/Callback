import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader2 } from "lucide-react";
import { SharedProof } from "@/components/app/shared-proof";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.reportTitle, description: t.meta.reportDescription };
}

/**
 * Reads the id and renders the proof.
 *
 * Kept as its own component so the `await params` happens inside the Suspense
 * boundary below. With Cache Components enabled, route params are runtime data
 * and awaiting them in the page body would stop the route prerendering at all.
 */
async function Proof({ params }: { params: PageProps<"/[lang]/app/report/[id]">["params"] }) {
  const { id } = await params;
  return <SharedProof id={id} />;
}

/**
 * A stamped report by its on-chain id.
 *
 * The same proof the `?report=` share link renders, given its own route so a
 * stamped report has a clean, linkable URL. Both read from the chain rather
 * than from local storage, so the page works for any visitor, with or without
 * a wallet.
 */
export default async function ReportPage({ params }: PageProps<"/[lang]/app/report/[id]">) {
  const { t } = await getI18n();
  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-6 lg:px-10">
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2
              className="size-5 animate-spin text-muted motion-reduce:animate-none"
              aria-hidden="true"
            />
            <span className="sr-only">{t.app.proof.loadingShort}</span>
          </div>
        }
      >
        <Proof params={params} />
      </Suspense>
    </div>
  );
}
