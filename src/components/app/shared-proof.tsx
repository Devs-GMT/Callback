"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { Card, Eyebrow } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Gauge } from "@/components/ui/gauge";
import { Tag } from "@/components/ui/tag";
import { ChainGlyph } from "@/components/brand";
import { fetchOnChainReport } from "@/lib/chain/wallet";
import { ACTIVE_CHAIN, IS_CONTRACT_DEPLOYED } from "@/lib/config";
import type { OnChainReport } from "@/lib/chain/abi";
import { formatDate, shortAddress } from "@/lib/utils";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";


/**
 * A stamped report, opened from a share link (`?report=31`).
 *
 * Everything here is read from the chain over the public RPC, so the page
 * works for a visitor with no wallet, no history in this browser, and no
 * connection to whoever stamped it.
 *
 * What it shows is bounded by what the contract stores: two scores, the job
 * title, a date, the owner's address and two hashes. There is no CV content on
 * chain to leak, which is the point of the design — see PRD section 5.
 */
export function SharedProof({ id }: { id: string }) {
  const [state, setState] = useState<
    | { phase: "loading" }
    | { phase: "found"; report: OnChainReport; parent: OnChainReport | null }
    | { phase: "missing" }
    | { phase: "unavailable" }
  >({ phase: "loading" });
  const { locale, t } = useI18n();
  const p = t.app.proof;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!IS_CONTRACT_DEPLOYED) {
        setState({ phase: "unavailable" });
        return;
      }

      const numeric = Number(id);
      if (!Number.isInteger(numeric) || numeric < 1) {
        setState({ phase: "missing" });
        return;
      }

      const report = await fetchOnChainReport(numeric);
      if (cancelled) return;

      if (!report) {
        setState({ phase: "missing" });
        return;
      }

      // A re-check points at the report it improved on, so fetch that too and
      // the before/after can be shown rather than just the latest number.
      const parent =
        report.improvedFrom > 0n
          ? await fetchOnChainReport(Number(report.improvedFrom))
          : null;

      if (cancelled) return;
      setState({ phase: "found", report, parent });
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.phase === "loading") {
    return (
      <Card className="mx-auto max-w-[520px] text-center">
        <Loader2
          className="mx-auto size-5 animate-spin text-muted motion-reduce:animate-none"
          aria-hidden="true"
        />
        <p className="mt-3 text-[13px] text-muted">
          {fmt(p.loading, { id, chain: ACTIVE_CHAIN.name })}
        </p>
      </Card>
    );
  }

  if (state.phase === "unavailable") {
    return (
      <Card surface="sand" className="mx-auto max-w-[520px] text-center">
        <p className="font-serif text-[20px] text-ink">{p.unavailableTitle}</p>
        <p className="mx-auto mt-2 max-w-[42ch] text-[12.5px] leading-relaxed text-muted">
          {fmt(p.unavailableBody, { chain: ACTIVE_CHAIN.name })}
        </p>
        <ButtonLink href="/app" className="mt-5">
          {p.check}
        </ButtonLink>
      </Card>
    );
  }

  if (state.phase === "missing") {
    return (
      <Card surface="sand" className="mx-auto max-w-[520px] text-center">
        <p className="font-serif text-[20px] text-ink">{p.missingTitle}</p>
        <p className="mx-auto mt-2 max-w-[42ch] text-[12.5px] leading-relaxed text-muted">
          {fmt(p.missingBody, { id, chain: ACTIVE_CHAIN.name })}
        </p>
        <ButtonLink href="/app" className="mt-5">
          {p.checkOwn}
        </ButtonLink>
      </Card>
    );
  }

  const { report, parent } = state;
  const stampedAt = Number(report.at) * 1000;

  return (
    <div className="mx-auto max-w-[620px]">
      <header className="mb-5 text-center">
        <Eyebrow className="mb-2">{fmt(p.verified, { chain: ACTIVE_CHAIN.name })}</Eyebrow>
        <h1 className="display-3 font-serif text-ink">
          {report.jobTitle || p.untitled}
        </h1>
        <p className="mt-2 text-[13px] text-muted">
          {fmt(p.reportLine, { id, date: formatDate(stampedAt, locale) })}
        </p>
      </header>

      <Card className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-center gap-10">
          <Gauge
            value={report.atsScore}
            label={p.atsScore}
            caption={parent ? fmt(p.was, { value: parent.atsScore }) : p.outOf}
          />
          <Gauge
            value={report.matchScore}
            label={p.jobMatch}
            unit="%"
            caption={parent ? fmt(p.was, { value: `${parent.matchScore}%` }) : p.againstJob}
          />
        </div>

        {parent ? (
          <p className="rounded-[4px] bg-mint/35 px-3 py-2.5 text-center text-[12.5px] leading-relaxed text-mint-ink">
            {fmt(p.rechecked, {
              fromAts: parent.atsScore,
              toAts: report.atsScore,
              fromMatch: parent.matchScore,
              toMatch: report.matchScore,
            })}
          </p>
        ) : null}

        <dl className="grid gap-2 border-t border-line pt-4 text-[12px]">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">{p.stampedBy}</dt>
            <dd className="font-mono text-ink">{shortAddress(report.owner)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">{p.reportHash}</dt>
            <dd className="font-mono text-ink">{shortAddress(report.reportHash, 10, 6)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">{p.cvHash}</dt>
            <dd className="font-mono text-ink">{shortAddress(report.cvHash, 10, 6)}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <Tag tone="lilac">
            <ChainGlyph className="text-[12px]" />
            {p.onChain}
          </Tag>
          <ButtonLink
            href={`${ACTIVE_CHAIN.explorerUrl}/address/${report.owner}`}
            external
            tone="outline"
            size="sm"
          >
            {p.explorer}
            <ExternalLink className="size-3.5" aria-hidden="true" />
          </ButtonLink>
          <ButtonLink href="/app" size="sm" className="ml-auto">
            {p.checkOwn}
          </ButtonLink>
        </div>
      </Card>

      <p className="mt-5 text-center text-[11.5px] leading-relaxed text-muted">
        {p.note}
      </p>
    </div>
  );
}
