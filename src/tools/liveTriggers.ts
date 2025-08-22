import axios from "axios";
import { memeTokens } from "../common/memeTokens";
import { hasRecentlyTriggered, markTriggered } from "../utils/triggerState";

const CHAIN = "seiv2";

interface TriggerCandidate {
  symbol: string;
  pair: string;
  priceChange: number;
  volume: number;
  liquidity: number;
}

export async function getLiveTriggers(): Promise<TriggerCandidate[]> {
  const results: TriggerCandidate[] = [];

  for (const token of memeTokens) {
    try {
      const res = await axios.get(
        `https://api.dexscreener.com/latest/dex/pairs/${CHAIN}/${token.pair}`
      );
      const pair = res.data.pairs?.[0];
      if (!pair) continue;

      const symbol = pair.baseToken?.symbol || "?";
      const priceChange = parseFloat(pair.priceChange?.m5 || "0");
      const volume = parseFloat(pair.volume?.h1 || "0");
      const liquidity = parseFloat(pair.liquidity?.usd || "0");

      const trigger = Math.abs(priceChange) > 2 && volume > 50 && !hasRecentlyTriggered(symbol);
      if (trigger) {
        results.push({ symbol, pair: token.pair, priceChange, volume, liquidity });
        markTriggered(symbol);
      }
    } catch (e) {
      console.warn("❌ Live trigger fetch error:", token.symbol);
    }
  }

  return results;
}
