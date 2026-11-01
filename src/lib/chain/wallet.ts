/**
 * MetaMask and BOT Chain.
 *
 * PRD section 1 asks for a connect button, the short address, and an automatic
 * switch to (or add of) BOT Chain mainnet. PRD section 11 adds the states: no
 * MetaMask, wrong network, and a transaction that is pending, rejected or
 * failed.
 *
 * The wallet is only ever needed to stamp. Everything else in the app — the
 * analysis, the report, the exports, the local history — works with no wallet
 * at all, so nothing here is on a critical path.
 */

import {
  BrowserProvider,
  Contract,
  JsonRpcProvider,
  type Eip1193Provider,
} from "ethers";
import { CALLBACK_ABI, CONTRACT_ERROR_MESSAGES, type OnChainReport } from "@/lib/chain/abi";
import { ACTIVE_CHAIN, CONTRACT_ADDRESS, IS_CONTRACT_DEPLOYED } from "@/lib/config";

type InjectedProvider = Eip1193Provider & {
  isMetaMask?: boolean;
  providers?: InjectedProvider[];
  on?: (event: string, handler: (...args: never[]) => void) => void;
  removeListener?: (event: string, handler: (...args: never[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: InjectedProvider;
  }
}

/* -------------------------------------------------------------------------- */
/* Errors                                                                     */
/* -------------------------------------------------------------------------- */

export type WalletErrorKind =
  | "no-wallet"
  | "rejected"
  | "wrong-network"
  | "not-deployed"
  | "contract"
  | "failed";

export class WalletError extends Error {
  kind: WalletErrorKind;
  constructor(kind: WalletErrorKind, message: string) {
    super(message);
    this.name = "WalletError";
    this.kind = kind;
  }
}

/** EIP-1193 rejection, and MetaMask's own variant of it. */
function isUserRejection(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = (error as { code?: unknown }).code;
  if (code === 4001 || code === "ACTION_REJECTED") return true;
  const nested = (error as { info?: { error?: { code?: unknown } } }).info?.error?.code;
  return nested === 4001;
}

/** Pull a contract custom-error name out of whatever ethers threw. */
function contractErrorName(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const direct = (error as { revert?: { name?: unknown } }).revert?.name;
  if (typeof direct === "string") return direct;

  const message = (error as { message?: unknown }).message;
  if (typeof message !== "string") return null;
  for (const name of Object.keys(CONTRACT_ERROR_MESSAGES)) {
    if (message.includes(name)) return name;
  }
  return null;
}

function toWalletError(error: unknown, fallback: string): WalletError {
  if (error instanceof WalletError) return error;
  if (isUserRejection(error)) {
    return new WalletError("rejected", "You cancelled the transaction in your wallet.");
  }
  const name = contractErrorName(error);
  if (name) return new WalletError("contract", CONTRACT_ERROR_MESSAGES[name] ?? fallback);
  return new WalletError("failed", fallback);
}

/* -------------------------------------------------------------------------- */
/* Provider discovery                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Find the injected provider, preferring MetaMask.
 *
 * When several wallets are installed they often share `window.ethereum` and
 * expose the rest under `providers`, so picking MetaMask explicitly avoids
 * prompting through whichever extension happened to load last.
 */
export function getInjectedProvider(): InjectedProvider | null {
  if (typeof window === "undefined") return null;
  const injected = window.ethereum;
  if (!injected) return null;
  if (Array.isArray(injected.providers)) {
    return injected.providers.find((candidate) => candidate.isMetaMask) ?? injected.providers[0];
  }
  return injected;
}

export function hasWallet(): boolean {
  return getInjectedProvider() !== null;
}

export const METAMASK_INSTALL_URL = "https://metamask.io/download/";

/* -------------------------------------------------------------------------- */
/* Connecting                                                                 */
/* -------------------------------------------------------------------------- */

export async function getAccounts(): Promise<string[]> {
  const provider = getInjectedProvider();
  if (!provider) return [];
  try {
    // `eth_accounts` does not prompt — it reports an existing connection, so
    // a returning visitor sees their address without a popup.
    return (await provider.request({ method: "eth_accounts" })) as string[];
  } catch {
    return [];
  }
}

export async function requestAccounts(): Promise<string[]> {
  const provider = getInjectedProvider();
  if (!provider) {
    throw new WalletError(
      "no-wallet",
      "MetaMask isn't installed. Everything else works — you only need a wallet to stamp a report.",
    );
  }
  try {
    const accounts = (await provider.request({
      method: "eth_requestAccounts",
    })) as string[];
    if (accounts.length === 0) {
      throw new WalletError("rejected", "No account was shared.");
    }
    return accounts;
  } catch (error) {
    throw toWalletError(error, "We couldn't connect to your wallet.");
  }
}

export async function getChainId(): Promise<number | null> {
  const provider = getInjectedProvider();
  if (!provider) return null;
  try {
    const hex = (await provider.request({ method: "eth_chainId" })) as string;
    return Number.parseInt(hex, 16);
  } catch {
    return null;
  }
}

/**
 * Switch to BOT Chain, adding it to the wallet first if it is unknown.
 *
 * 4902 is "unrecognized chain", which is the expected answer the first time a
 * user stamps, so the add-then-switch path is the normal one rather than an
 * error case.
 */
export async function switchToActiveChain(): Promise<void> {
  const provider = getInjectedProvider();
  if (!provider) {
    throw new WalletError("no-wallet", "MetaMask isn't installed.");
  }

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ACTIVE_CHAIN.chainIdHex }],
    });
    return;
  } catch (error) {
    const code = (error as { code?: unknown }).code;
    const nested = (error as { data?: { originalError?: { code?: unknown } } }).data
      ?.originalError?.code;

    if (code !== 4902 && nested !== 4902) {
      throw toWalletError(error, `We couldn't switch to ${ACTIVE_CHAIN.name}.`);
    }
  }

  try {
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: ACTIVE_CHAIN.chainIdHex,
          chainName: ACTIVE_CHAIN.name,
          nativeCurrency: ACTIVE_CHAIN.currency,
          rpcUrls: [ACTIVE_CHAIN.rpcUrl],
          blockExplorerUrls: [ACTIVE_CHAIN.explorerUrl],
        },
      ],
    });
  } catch (error) {
    throw toWalletError(error, `We couldn't add ${ACTIVE_CHAIN.name} to your wallet.`);
  }
}

/* -------------------------------------------------------------------------- */
/* Contract calls                                                             */
/* -------------------------------------------------------------------------- */

function requireDeployed(): void {
  if (!IS_CONTRACT_DEPLOYED) {
    throw new WalletError(
      "not-deployed",
      "The Callback contract isn't deployed yet, so stamping is turned off.",
    );
  }
}

async function getSignerContract(): Promise<{ contract: Contract; address: string }> {
  requireDeployed();

  const injected = getInjectedProvider();
  if (!injected) {
    throw new WalletError("no-wallet", "MetaMask isn't installed.");
  }

  const provider = new BrowserProvider(injected);
  const network = await provider.getNetwork();

  if (Number(network.chainId) !== ACTIVE_CHAIN.chainId) {
    throw new WalletError(
      "wrong-network",
      `Switch to ${ACTIVE_CHAIN.name} to stamp this report.`,
    );
  }

  const signer = await provider.getSigner();
  return {
    contract: new Contract(CONTRACT_ADDRESS, CALLBACK_ABI, signer),
    address: await signer.getAddress(),
  };
}

/**
 * A read-only contract over the public RPC.
 *
 * Used for a shared `?report=` link and the footer's stamp counter, neither of
 * which should require the visitor to have a wallet at all.
 */
function getReadContract(): Contract {
  requireDeployed();
  const provider = new JsonRpcProvider(ACTIVE_CHAIN.rpcUrl, ACTIVE_CHAIN.chainId, {
    staticNetwork: true,
  });
  return new Contract(CONTRACT_ADDRESS, CALLBACK_ABI, provider);
}

export type StampArgs = {
  reportHash: string;
  cvHash: string;
  atsScore: number;
  matchScore: number;
  /** 0 for a first check, or an earlier on-chain report id of the same owner. */
  improvedFrom: number;
  jobTitle: string;
};

export type StampResult = {
  onChainId: number;
  txHash: string;
  owner: string;
};

/**
 * Stamp a report and wait for it to be mined.
 *
 * The new id is read from the `Stamped` event rather than from the return
 * value, because a transaction's return value is not available to a caller
 * once it is mined — only its logs are.
 */
export async function stampReport(args: StampArgs): Promise<StampResult> {
  const { contract, address } = await getSignerContract();

  try {
    const tx = await contract.stamp(
      args.reportHash,
      args.cvHash,
      args.atsScore,
      args.matchScore,
      BigInt(args.improvedFrom),
      args.jobTitle.slice(0, 60),
    );

    const receipt = await tx.wait();
    if (!receipt) {
      throw new WalletError("failed", "The transaction didn't confirm. Try again.");
    }

    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog({
          topics: [...log.topics],
          data: log.data,
        });
        if (parsed?.name === "Stamped") {
          return {
            onChainId: Number(parsed.args[0]),
            txHash: tx.hash,
            owner: String(parsed.args[1] ?? address),
          };
        }
      } catch {
        // A log from another contract in the same transaction; skip it.
      }
    }

    throw new WalletError(
      "failed",
      "The transaction went through but we couldn't read the report id.",
    );
  } catch (error) {
    throw toWalletError(error, "The transaction failed. Please try again.");
  }
}

/** Read a stamped report by its on-chain id, for a shared `?report=` link. */
export async function fetchOnChainReport(id: number): Promise<OnChainReport | null> {
  try {
    const contract = getReadContract();
    const result = await contract.getReport(BigInt(id));
    return {
      owner: String(result[0]),
      reportHash: String(result[1]),
      cvHash: String(result[2]),
      atsScore: Number(result[3]),
      matchScore: Number(result[4]),
      improvedFrom: BigInt(result[5]),
      jobTitle: String(result[6]),
      at: BigInt(result[7]),
    };
  } catch {
    // An unknown id reverts, which is the contract telling us it is not there.
    return null;
  }
}

/** Totals for the footer's live "Reports stamped" line. */
export async function fetchStats(): Promise<{ reports: number; rechecks: number } | null> {
  try {
    const contract = getReadContract();
    const [reports, rechecks] = await contract.stats();
    return { reports: Number(reports), rechecks: Number(rechecks) };
  } catch {
    return null;
  }
}
