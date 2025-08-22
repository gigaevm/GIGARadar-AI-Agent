import { Address } from "viem";

/**
 * 
 * @param ticker 
 * @returns 
 */
export async function getTokenAddressFromTicker(
    ticker: string,
  ): Promise<Address | null> {
    if (typeof ticker !== 'string' || ticker.trim() === '') {
      console.error("Error: Ticker must be a non-empty string");
      throw new Error("Ticker must be a non-empty string");
    }

    try {
        // Make API request
        const response = await fetch(
          `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(ticker)}`,
        );

        if (!response.ok) {
          throw new Error(`DexScreener API request failed with status: ${response.status}`);
        }

        const data = await response.json();

        // Validate response data
        if (!data) {
          throw new Error("Invalid response data from DexScreener API");
        }

        if (!data.pairs || !Array.isArray(data.pairs) || data.pairs.length === 0) {
          console.warn(`No pairs found for ticker: ${ticker}`);
          return null;
        }

        // Filter for Sei v2 chain pairs
        let seiPairs = data.pairs.filter((pair: any) => {
          if (!pair || typeof pair !== 'object') return false;
          if (!pair.chainId || typeof pair.chainId !== 'string') return false;
          return pair.chainId === "seiv2";
        });

        if (!seiPairs.length) {
          console.warn(`No Sei v2 pairs found for ticker: ${ticker}`);
          return null;
        }

        // Filter by matching base token symbol
        seiPairs = seiPairs.filter(
          (pair: any) => {
            if (!pair || !pair.baseToken || !pair.baseToken.symbol) return false;
            return pair.baseToken.symbol.toLowerCase() === ticker.toLowerCase();
          }
        );

        if (!seiPairs.length) {
          console.warn(`No matching pairs found for ticker symbol: ${ticker}`);
          return null;
        }

        // Validate base token address
        const firstPair = seiPairs[0];
        if (!firstPair.baseToken || !firstPair.baseToken.address) {
          throw new Error(`Invalid token data structure for ticker: ${ticker}`);
        }

        return firstPair.baseToken.address as Address;
    } catch (error) {
        console.error(`Error fetching token address from DexScreener: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
    }
}
