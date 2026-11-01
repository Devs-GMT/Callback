import type { HardhatUserConfig } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";

/**
 * This package exists only to compile and test Callback.sol. Deployment is
 * done by hand in Remix against BOT Chain testnet (968) and then mainnet
 * (677), so no private key or RPC credential is configured here or needed.
 */
const config: HardhatUserConfig = {
  plugins: [hardhatToolboxMochaEthers],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
        settings: {
          optimizer: { enabled: true, runs: 200 },
        },
      },
    },
  },
  networks: {
    hardhat: {
      type: "edr-simulated",
      chainType: "l1",
    },
  },
};

export default config;
