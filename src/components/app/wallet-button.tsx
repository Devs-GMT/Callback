"use client";

import { ACTIVE_CHAIN } from "@/lib/config";
import { METAMASK_INSTALL_URL } from "@/lib/chain/wallet";
import { useWallet } from "@/components/app/wallet-context";
import { Button, ButtonLink } from "@/components/ui/button";
import { shortAddress } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * The wallet control, in all five of its states.
 *
 * PRD section 11 spells out what each one says. The important one is
 * "no-wallet": it must read as optional, because the whole app apart from
 * stamping works without a wallet and a visitor who thinks they need MetaMask
 * to check their CV will leave.
 */
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

  const body = (() => {
    switch (wallet.status) {
      case "unknown":
        // Render the eventual width as a placeholder so the navbar does not
        // reflow once the client knows whether a wallet is installed.
        return (
          <span
            className={cn(
              "inline-block h-10 w-[116px] rounded-[4px]",
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
            size="md"
          >
            Install MetaMask
          </ButtonLink>
        );

      case "disconnected":
        return (
          <Button
            tone="outline"
            on={on}
            size="md"
            onClick={() => void wallet.connect()}
            disabled={wallet.busy}
          >
            {wallet.busy ? "Connecting…" : "Connect wallet"}
          </Button>
        );

      case "wrong-network":
        return (
          <Button
            tone="primary"
            on={on}
            size="md"
            onClick={() => void wallet.switchNetwork()}
            disabled={wallet.busy}
          >
            {wallet.busy ? "Switching…" : `Switch to ${ACTIVE_CHAIN.name}`}
          </Button>
        );

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
              Connected to {ACTIVE_CHAIN.name} as {wallet.address}
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
