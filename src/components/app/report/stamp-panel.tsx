"use client";

import { useState } from "react";
import { Check, Copy, Download, ExternalLink, Loader2, Stamp } from "lucide-react";
import { Card, Eyebrow } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { ChainGlyph } from "@/components/brand";
import { useWallet } from "@/components/app/wallet-context";
import { hashCv, hashReport } from "@/lib/chain/hash";
import { WalletError, stampReport } from "@/lib/chain/wallet";
import { buildReportPdf, reportPdfFilename } from "@/lib/export/report-pdf";
import { downloadBlob } from "@/lib/export/cv-docx";
import { getOrCreateSalt, saveReportAndNotify } from "@/lib/store/local";
import {
  ACTIVE_CHAIN,
  IS_CONTRACT_DEPLOYED,
  SITE_URL,
  explorerTxUrl,
} from "@/lib/config";
import type { Report, StampInfo } from "@/lib/types";
import { formatDate, shortAddress } from "@/lib/utils";
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";

/**
 * Step 6 of PRD section 2: export and stamp.
 *
 * The stamp is the only part of the app that needs a wallet, so this panel
 * carries the whole explanation of what goes on chain — two hashes, two
 * scores, the job title and a date — and what does not. A user about to sign a
 * transaction should not have to go looking for that.
 *
 * `improvedFrom` is read from the parent report's on-chain id, which is what
 * lets the contract link a re-check to the check it improved on. If the parent
 * was never stamped, this stamps as a first check rather than failing: the
 * contract would reject an unknown parent, and silently losing the stamp would
 * be the worse outcome.
 */
export function StampPanel({
  report,
  parentOnChainId,
  onStamped,
}: {
  report: Report;
  /** On-chain id of the report this one improved on, if it was stamped. */
  parentOnChainId?: number;
  onStamped: (stamp: StampInfo) => void;
}) {
  const wallet = useWallet();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { locale, t } = useI18n();
  const s = t.report.stamp;
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = report.stamp
    ? `${SITE_URL}/app?report=${report.stamp.onChainId}`
    : null;

  const exportPdf = async () => {
    setExporting(true);
    try {
      const blob = await buildReportPdf(report);
      downloadBlob(blob, reportPdfFilename(report));
    } finally {
      setExporting(false);
    }
  };

  const stamp = async () => {
    setBusy(true);
    setError(null);
    try {
      if (wallet.status === "disconnected" || wallet.status === "unknown") {
        await wallet.connect();
      }

      const salt = getOrCreateSalt();
      const [reportHash, cvHash] = await Promise.all([
        hashReport(report),
        hashCv(report.improvedCvText || report.cvText, salt),
      ]);

      const result = await stampReport({
        reportHash,
        cvHash,
        atsScore: report.ats.score,
        matchScore: report.match.score,
        improvedFrom: parentOnChainId ?? 0,
        jobTitle: report.jobTitle,
      });

      const info: StampInfo = {
        onChainId: result.onChainId,
        txHash: result.txHash,
        owner: result.owner,
        stampedAt: Date.now(),
      };

      saveReportAndNotify({ ...report, stamp: info });
      onStamped(info);
    } catch (caught) {
      setError(
        caught instanceof WalletError
          ? caught.message
          : s.failed,
      );
    } finally {
      setBusy(false);
    }
  };

  const copyShare = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Permission can be refused; the link is shown in full below.
    }
  };

  /* ------------------------------------------------------------------ */
  /* Already stamped                                                    */
  /* ------------------------------------------------------------------ */

  if (report.stamp) {
    return (
      <Card surface="espresso" className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Eyebrow on="dark" className="mb-2">
              {fmt(s.stampedOn, { chain: ACTIVE_CHAIN.name })}
            </Eyebrow>
            <p className="font-serif text-[18px] leading-snug text-white">
              {fmt(s.reportNumber, { id: report.stamp.onChainId })}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-dark">
              {fmt(s.summary, {
                job: report.jobTitle,
                date: formatDate(report.stamp.stampedAt, locale),
                score: report.match.score,
              })}
            </p>
          </div>
          <Tag tone="mint" className="shrink-0">
            <Check className="size-3" aria-hidden="true" />
            {s.onChain}
          </Tag>
        </div>

        <dl className="grid gap-2 border-t border-white/10 pt-3 text-[11.5px]">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-dark">{s.stampedBy}</dt>
            <dd className="font-mono text-white">
              {shortAddress(report.stamp.owner)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-dark">{s.transaction}</dt>
            <dd>
              <a
                href={explorerTxUrl(report.stamp.txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-white underline decoration-white/30 underline-offset-2 hover:decoration-white"
              >
                {shortAddress(report.stamp.txHash)}
                <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            </dd>
          </div>
        </dl>

        {shareUrl ? (
          <div className="border-t border-white/10 pt-3">
            <Eyebrow on="dark" className="mb-2">
              {s.share}
            </Eyebrow>
            <p className="mb-2.5 text-[11.5px] leading-relaxed text-muted-dark">
              {s.shareNote}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button tone="outline" on="dark" size="sm" onClick={() => void copyShare()}>
                <Copy className="size-3.5" aria-hidden="true" />
                {copied ? s.copied : s.copyLink}
              </Button>
              <ButtonLink
                href={`/app?report=${report.stamp.onChainId}`}
                tone="ghost"
                on="dark"
                size="sm"
              >
                {s.open}
              </ButtonLink>
            </div>
          </div>
        ) : null}

        <Button
          tone="outline"
          on="dark"
          size="sm"
          onClick={() => void exportPdf()}
          disabled={exporting}
          className="self-start"
        >
          <Download className="size-3.5" aria-hidden="true" />
          {exporting ? s.building : s.download}
        </Button>
      </Card>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Not yet stamped                                                    */
  /* ------------------------------------------------------------------ */

  const stampLabel = (() => {
    if (busy) return s.confirm;
    if (wallet.status === "no-wallet") return s.needsWallet;
    if (wallet.status === "wrong-network") return fmt(s.switchTo, { chain: ACTIVE_CHAIN.name });
    if (wallet.status === "disconnected") return s.connect;
    return s.stamp;
  })();

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <Eyebrow className="mb-2">{s.eyebrow}</Eyebrow>
        <p className="text-[13px] leading-relaxed text-muted">
          {s.lede}
        </p>
      </div>

      <Button
        tone="outline"
        onClick={() => void exportPdf()}
        disabled={exporting}
        className="self-start"
      >
        <Download className="size-4" aria-hidden="true" />
        {exporting ? s.buildingPdf : s.download}
      </Button>

      <div className="border-t border-line pt-4">
        <div className="mb-2.5 flex items-center gap-2">
          <ChainGlyph className="text-[15px] text-muted" />
          <h3 className="text-[13px] font-medium text-ink">
            {s.progress}
          </h3>
        </div>

        <p className="text-[12px] leading-relaxed text-muted">
          {fmt(s.writes, { chain: ACTIVE_CHAIN.name })}
        </p>

        {parentOnChainId ? (
          <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted">
            {fmt(s.links, { id: parentOnChainId })}
          </p>
        ) : null}

        {IS_CONTRACT_DEPLOYED ? (
          <Button
            className="mt-3.5"
            onClick={() => {
              if (wallet.status === "wrong-network") {
                void wallet.switchNetwork();
                return;
              }
              void stamp();
            }}
            disabled={busy || wallet.status === "no-wallet" || wallet.busy}
          >
            {busy ? (
              <Loader2
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <Stamp className="size-4" aria-hidden="true" />
            )}
            {stampLabel}
          </Button>
        ) : (
          <p className="mt-3.5 rounded-[4px] bg-sand px-3 py-2.5 text-[12px] leading-relaxed text-muted">
            {fmt(s.notDeployed, { chain: ACTIVE_CHAIN.name })}
          </p>
        )}

        {wallet.status === "no-wallet" && IS_CONTRACT_DEPLOYED ? (
          <p className="mt-2.5 text-[11.5px] leading-relaxed text-muted">
            {s.onlyWallet}
          </p>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-[4px] bg-coral/35 px-3 py-2.5 text-[12px] leading-relaxed text-coral-ink"
          >
            {error}
          </p>
        ) : null}
      </div>

      <p className="border-t border-line pt-3 text-[11px] leading-relaxed text-muted">
        {s.footnote}
      </p>
    </Card>
  );
}
