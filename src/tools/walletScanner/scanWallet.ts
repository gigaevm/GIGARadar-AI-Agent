// src/tools/walletScanner/scanWallet.ts

import { createPublicClient, http, Address } from "viem";
import { erc20Abi } from "viem";
import { memeTokens } from "../../common/memeTokens";

const seiRpc = "https://rpc.ankr.com/sei_evm/fde46fed9f309b6559da6f7685e76da91e0a061597088280a88593eaf2940ecc";

const publicClient = createPublicClient({
  transport: http(seiRpc),
  chain: {
    id: 1329,
    name: "Sei EVM",
    nativeCurrency: { name: "SEI", symbol: "SEI", decimals: 18 },
    rpcUrls: {
      default: { http: [seiRpc] },
    },
  },
});

export async function scanWallet(walletAddress: string): Promise<string[]> {
  const ownedTokens: string[] = [];

  for (const token of memeTokens) {
    try {
      const balance = await publicClient.readContract({
        address: token.address as Address,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [walletAddress as Address],
      });

      if (typeof balance === "bigint" && balance > 0n) {
        ownedTokens.push(token.symbol);
      }
    } catch (err) {
      console.error(`[ERROR] ${token.symbol}:`, err);
    }
  }

  return ownedTokens;
}
