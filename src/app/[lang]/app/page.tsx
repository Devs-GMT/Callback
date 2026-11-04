import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AppFlow } from "@/components/app/app-flow";
import { getI18n } from "@/i18n/server";

/**
 * The app route.
 *
 * `AppFlow` reads `?report=` with `useSearchParams`, which needs a Suspense
 * boundary: with Cache Components enabled, the rest of this route prerenders
 * and the search params arrive at request time. The fallback is deliberately
 * plain — it is visible for a moment at most, and anything more elaborate
 * would flash against the real layout underneath it.
 */
export default async function AppPage() {
  const { t } = await getI18n();
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2
            className="size-5 animate-spin text-muted motion-reduce:animate-none"
            aria-hidden="true"
          />
          <span className="sr-only">{t.app.flow.loading}</span>
        </div>
      }
    >
      <AppFlow />
    </Suspense>
  );
}
