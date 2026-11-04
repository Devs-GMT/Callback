"use client";

import { ACTIVE_CHAIN } from "@/lib/config";
import { METAMASK_INSTALL_URL } from "@/lib/chain/wallet";
import { useWallet } from "@/components/app/wallet-context";
import { Button, ButtonLink } from "@/components/ui/button";
import { shortAddress } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

/**
 * The wallet control, in all five of its states.
 *
 * PRD section 11 spells out what each one says. The important one is
 * "no-wallet": it must read as optional, because the whole app apart from
 * stamping works without a wallet and a visitor who thinks they need MetaMask
 * to check their CV will leave.
 */
import { useI18n } from "@/i18n/client";
import { fmt } from "@/i18n/config";

export function WalletButton({
  on = "light",
  compact,
  className,
}: {
  on?: "light" | "dark";
  /** Navbar variant: no error text, no surrounding block. */
  compact?: boolean;
  className?: string;
}) {
  const wallet = useWallet();
  const wb = useI18n().t.app.wallet;

  const body = (() => {
    switch (wallet.status) {
      case "unknown":
        // Render the eventual width as a placeholder so the navbar does not
        // reflow once the client knows whether a wallet is installed.
        return (
          <span
            className={cn(
              "inline-block h-10 rounded-[4px]",
              compact ? "w-[92px]" : "w-[116px]",
              on === "dark" ? "bg-white/10" : "bg-ink/[0.06]",
            )}
            aria-hidden="true"
          />
        );

      case "no-wallet":
        return (
          <ButtonLink
            href={METAMASK_INSTALL_URL}
            external
            tone="outline"
            on={on}
            size={compact ? "sm" : "md"}
            title={compact ? wb.install : undefined}
          >
            {compact ? wb.installShort : wb.install}
          </ButtonLink>
        );

      case "disconnected":
        return (
          <Button
            tone="outline"
            on={on}
            size={compact ? "sm" : "md"}
            onClick={() => void wallet.connect()}
            disabled={wallet.busy}
            title={compact ? wb.connect : undefined}
          >
            {wallet.busy ? wb.connecting : compact ? wb.connectShort : wb.connect}
          </Button>
        );

      case "wrong-network": {
        const full = fmt(wb.switchTo, { chain: ACTIVE_CHAIN.name });
        return (
          <Button
            tone="primary"
            on={on}
            size={compact ? "sm" : "md"}
            onClick={() => void wallet.switchNetwork()}
            disabled={wallet.busy}
            title={full}
            aria-label={full}
          >
            <RefreshCw
              className={cn("size-3.5 shrink-0", wallet.busy && "animate-spin")}
              aria-hidden="true"
            />
            {wallet.busy ? wb.switching : compact ? wb.switchShort : full}
          </Button>
        );
      }

      case "connected":
        return (
          <span
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-[4px] border px-3 text-[12.5px] font-medium md:min-h-10",
              on === "dark"
                ? "border-white/20 text-white"
                : "border-line bg-sand text-ink",
            )}
            title={wallet.address ?? undefined}
          >
            <span
              className="size-1.5 shrink-0 rounded-full bg-[#4f9c76]"
              aria-hidden="true"
            />
            <span className="font-mono tabular-nums">
              {shortAddress(wallet.address ?? "")}
            </span>
            <span className="sr-only">
              {fmt(wb.connectedAs, { chain: ACTIVE_CHAIN.name, address: wallet.address ?? "" })}
            </span>
          </span>
        );
    }
  })();

  if (compact) return <span className={className}>{body}</span>;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {body}
      {wallet.error ? (
        <p
          role="alert"
          className={cn(
            "text-[11.5px] leading-relaxed",
            on === "dark" ? "text-coral" : "text-coral-ink",
          )}
        >
          {wallet.error}
        </p>
      ) : null}
    </div>
  );
}
