import { Address } from "viem";
import { getErc20Info } from './sei-erc20/balance';


/**
 * Resolves token metadata (name and symbol).
 * @param data An object containing the token address.
 * @returns Token name and symbol.
 */
export async function resolveTokenMeta(data: { tokenAddress: Address }) {
  try {
    const info = await getErc20Info(null as any, data.tokenAddress, data.tokenAddress);
    return {
      name: info.symbol || "UNKNOWN",
      symbol: info.symbol || "UNKNOWN",
    };
  } catch (error) {
    console.error("Error resolving token meta:", error);
    return { name: "UNKNOWN", symbol: "UNKNOWN" };
  }
}
