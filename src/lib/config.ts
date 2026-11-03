/**
 * Single source of truth for chain, contract and input limits.
 *
 * PRD §13 requires the contract address to live in exactly one config
 * constant — the footer badge, the README and the explorer link all read it
 * from here.
 */

export type ChainConfig = {
  chainId: number;
  /** 0x-prefixed hex form, which is what `wallet_switchEthereumChain` wants. */
  chainIdHex: string;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  currency: { name: string; symbol: string; decimals: number };
};

/** BOT Chain mainnet — PRD §6. */
export const BOT_CHAIN_MAINNET: ChainConfig = {
  chainId: 677,
  chainIdHex: "0x2a5",
  name: "BOT Chain",
  rpcUrl: "https://rpc.botchain.ai",
  explorerUrl: "https://scan.botchain.ai",
  currency: { name: "BOT", symbol: "BOT", decimals: 18 },
};

/** BOT Chain testnet (Bohr) — used while the contract is being verified. */
export const BOT_CHAIN_TESTNET: ChainConfig = {
  chainId: 968,
  chainIdHex: "0x3c8",
  name: "BOT Chain Testnet",
  rpcUrl: "https://rpc.bohr.life",
  explorerUrl: "https://scan.bohr.life",
  currency: { name: "BOT", symbol: "BOT", decimals: 18 },
};

/**
 * Which chain the app targets. Mainnet per PRD §1 ("Mainnet deployment");
 * set NEXT_PUBLIC_USE_TESTNET=1 locally to point at Bohr instead.
 */
export const ACTIVE_CHAIN: ChainConfig =
  process.env.NEXT_PUBLIC_USE_TESTNET === "1"
    ? BOT_CHAIN_TESTNET
    : BOT_CHAIN_MAINNET;

/**
 * Deployed `Callback.sol` address.
 *
 * Deployment is done manually in Remix (testnet 968 first, then mainnet 677),
 * so this is filled in once from the deploy output. Everything that needs the
 * address reads this constant; nothing hardcodes it.
 */
export const CONTRACT_ADDRESS: string =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";

/** False until the contract is deployed — gates the whole stamping UI. */
export const IS_CONTRACT_DEPLOYED = /^0x[0-9a-fA-F]{40}$/.test(
  CONTRACT_ADDRESS,
);

export const EXPLORER_CONTRACT_URL = IS_CONTRACT_DEPLOYED
  ? `${ACTIVE_CHAIN.explorerUrl}/address/${CONTRACT_ADDRESS}`
  : ACTIVE_CHAIN.explorerUrl;

export function explorerTxUrl(hash: string) {
  return `${ACTIVE_CHAIN.explorerUrl}/tx/${hash}`;
}

/** Input caps — PRD §2 and §4. Enforced on both the client and the route. */
export const LIMITS = {
  cvChars: 15_000,
  jobChars: 10_000,
  /** Below this a job description is almost certainly a fragment (§11). */
  jobMinChars: 300,
  /** A CV shorter than this cannot be scored usefully. */
  cvMinChars: 200,
  fileBytes: 5 * 1024 * 1024,
  pdfPages: 4,
  /** Job title field, mirrored by the contract's 60-char bound (§5). */
  jobTitleChars: 60,
  /** §4 rate limit: analyses per IP per day. */
  analysesPerDay: 8,
  /** Cover letters per IP per day, a separate budget from analyses. */
  coverLettersPerDay: 8,
  /** The "why this company" note the user writes for the cover letter. */
  motivationChars: 600,
  hiringManagerChars: 80,
  /** §3 link extraction guards. */
  urlTimeoutMs: 5_000,
  urlBytes: 2 * 1024 * 1024,
} as const;

export const BRAND = {
  name: "Callback",
  tagline: "Get the callback.",
  botChainUrl: "https://botchain.ai",
  githubUrl: "https://github.com/", // set to the repo URL before launch
  xUrl: "https://x.com/",
  xHandle: "@BOTChain_ai",
} as const;

/** Site origin, used for canonical and share links. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");
