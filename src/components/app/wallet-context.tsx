"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { ACTIVE_CHAIN } from "@/lib/config";
import {
  WalletError,
  getAccounts,
  getChainId,
  getInjectedProvider,
  hasWallet,
  requestAccounts,
  switchToActiveChain,
} from "@/lib/chain/wallet";

/**
 * Wallet state for the whole app.
 *
 * Kept in context because three separate places need it — the left rail, the
 * navbar and the stamp button — and polling each independently would mean
 * three sets of listeners on the same provider.
 *
 * `status` starts as "unknown" rather than "no-wallet" so nothing renders
 * "Install MetaMask" during the first paint: whether a wallet exists is only
 * knowable on the client, and guessing wrong is a visible flash.
 */

export type WalletStatus =
  | "unknown"
  | "no-wallet"
  | "disconnected"
  | "wrong-network"
  | "connected";

export type WalletState = {
  status: WalletStatus;
  address: string | null;
  chainId: number | null;
  /** True while a connect or switch request is in flight. */
  busy: boolean;
  error: string | null;
  connect: () => Promise<void>;
  switchNetwork: () => Promise<void>;
  clearError: () => void;
};

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [installed, setInstalled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read the existing connection once on mount. `eth_accounts` does not
  // prompt, so a returning visitor sees their address with no popup.
  useEffect(() => {
    let cancelled = false;

    async function read() {
      const present = hasWallet();
      if (cancelled) return;
      setInstalled(present);
      if (!present) return;

      const [accounts, chain] = await Promise.all([getAccounts(), getChainId()]);
      if (cancelled) return;
      setAddress(accounts[0] ?? null);
      setChainId(chain);
    }

    void read();
    return () => {
      cancelled = true;
    };
  }, []);

  // Track account and chain changes from the wallet itself. Without this, a
  // user who switches network in MetaMask sees a stale "wrong network" banner.
  useEffect(() => {
    const provider = getInjectedProvider();
    if (!provider?.on) return;

    const onAccountsChanged = (...args: never[]) => {
      const accounts = args[0] as unknown as string[] | undefined;
      setAddress(accounts?.[0] ?? null);
    };

    const onChainChanged = (...args: never[]) => {
      const hex = args[0] as unknown as string | undefined;
      setChainId(hex ? Number.parseInt(hex, 16) : null);
      // A chain change invalidates whatever the last error was about.
      setError(null);
    };

    provider.on("accountsChanged", onAccountsChanged);
    provider.on("chainChanged", onChainChanged);

    return () => {
      provider.removeListener?.("accountsChanged", onAccountsChanged);
      provider.removeListener?.("chainChanged", onChainChanged);
    };
  }, []);

  const connect = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const accounts = await requestAccounts();
      setAddress(accounts[0] ?? null);

      const chain = await getChainId();
      setChainId(chain);

      // PRD section 1 asks for the switch to happen automatically on connect,
      // so the user is not left on the wrong network to discover it later.
      if (chain !== ACTIVE_CHAIN.chainId) {
        await switchToActiveChain();
        setChainId(await getChainId());
      }
    } catch (caught) {
      setError(
        caught instanceof WalletError
          ? caught.message
          : "We couldn't connect to your wallet.",
      );
    } finally {
      setBusy(false);
    }
  }, []);

  const switchNetwork = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await switchToActiveChain();
      setChainId(await getChainId());
    } catch (caught) {
      setError(
        caught instanceof WalletError
          ? caught.message
          : `We couldn't switch to ${ACTIVE_CHAIN.name}.`,
      );
    } finally {
      setBusy(false);
    }
  }, []);

  const status: WalletStatus = useMemo(() => {
    if (installed === null) return "unknown";
    if (!installed) return "no-wallet";
    if (!address) return "disconnected";
    if (chainId !== ACTIVE_CHAIN.chainId) return "wrong-network";
    return "connected";
  }, [installed, address, chainId]);

  const value = useMemo<WalletState>(
    () => ({
      status,
      address,
      chainId,
      busy,
      error,
      connect,
      switchNetwork,
      clearError: () => setError(null),
    }),
    [status, address, chainId, busy, error, connect, switchNetwork],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used inside a WalletProvider.");
  }
  return context;
}
