import axios from "axios";
import { memeTokens } from "../common/memeTokens";

const CHAIN = "seiv2";

interface Pair {
  pairAddress: string;
  baseToken: {
    symbol: string;
  };
  priceChange: {
    h24: string;
  };
  volume: {
    h24: string;
  };
  liquidity: {
    usd: string;
  };
}

export async function getTopMovers(limit = 3): Promise<Pair[]> {
  const allPairs: Pair[] = [];

  for (const token of memeTokens) {
    try {
      const res = await axios.get(
        `https://api.dexscreener.com/latest/dex/pairs/${CHAIN}/${token.pair}`
      );
      const pair = res.data.pairs?.[0];
      if (!pair) continue;
      allPairs.push(pair);
    } catch (err) {
      console.warn("❌ Error fetching:", token.symbol, err.message);
    }
  }

  const sorted = allPairs.sort((a, b) => {
    const changeA = parseFloat(a.priceChange?.h24 || "0");
    const changeB = parseFloat(b.priceChange?.h24 || "0");
    return changeB - changeA;
  });

  const gainers = sorted.slice(0, limit);
  const losers = sorted.slice(-limit).reverse();

  return [...gainers, ...losers];
}
