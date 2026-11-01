/**
 * The Callback.sol ABI, as a human-readable ethers fragment list.
 *
 * Written out rather than imported from the Hardhat artifact on purpose: the
 * contracts package is not installed during the Vercel build, so pulling its
 * build output into the app bundle would couple the web deploy to a Solidity
 * toolchain it does not have. This stays in step with the contract by being
 * small enough to read against it.
 */

export const CALLBACK_ABI = [
  "function stamp(bytes32 reportHash, bytes32 cvHash, uint8 atsScore, uint8 matchScore, uint256 improvedFrom, string calldata jobTitle) external returns (uint256 id)",
  "function getReport(uint256 id) external view returns (tuple(address owner, bytes32 reportHash, bytes32 cvHash, uint8 atsScore, uint8 matchScore, uint256 improvedFrom, string jobTitle, uint64 at))",
  "function reportsOf(address owner) external view returns (uint256[])",
  "function reportCountOf(address owner) external view returns (uint256)",
  "function stats() external view returns (uint256 totalReports, uint256 totalRechecks)",
  "event Stamped(uint256 indexed id, address indexed owner, uint8 atsScore, uint8 matchScore)",
] as const;

/** Mirrors the `Report` struct the views return. */
export type OnChainReport = {
  owner: string;
  reportHash: string;
  cvHash: string;
  atsScore: number;
  matchScore: number;
  improvedFrom: bigint;
  jobTitle: string;
  at: bigint;
};

/**
 * Custom error names from the contract, mapped to what to tell the user.
 *
 * ethers surfaces a custom error by name once it can decode it, so matching on
 * these gives a precise message instead of "transaction reverted".
 */
export const CONTRACT_ERROR_MESSAGES: Record<string, string> = {
  ScoreOutOfRange: "Those scores are out of range. Re-run the check and try again.",
  JobTitleTooLong: "That job title is too long to stamp. Shorten it to 60 characters.",
  EmptyHash: "This report couldn't be hashed. Re-run the check and try again.",
  UnknownParent: "The earlier report this links to isn't on chain.",
  NotParentOwner:
    "The earlier report this links to was stamped by a different wallet. Connect that wallet, or stamp this as a new report.",
};
