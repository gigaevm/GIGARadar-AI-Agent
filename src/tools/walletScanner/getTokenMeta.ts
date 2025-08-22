console.log("⚡ getTokenMeta.ts loaded!");

import axios from "axios";

export async function getTokenMeta(tokenAddress: string) {
  const url = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`;
  try {
    const { data } = await axios.get(url);

    if (!data.pairs || data.pairs.length === 0) return null;

    const sorted = data.pairs.sort((a, b) => b.liquidity.usd - a.liquidity.usd);
    const mainPair = sorted[0];

    return {
      name: mainPair.baseToken.name,
      symbol: mainPair.baseToken.symbol,
      priceUsd: parseFloat(mainPair.priceUsd),
      volume24h: parseFloat(mainPair.volume.h24),
      liquidity: parseFloat(mainPair.liquidity.usd),
      change1h: parseFloat(mainPair.priceChange.h1),
      change24h: parseFloat(mainPair.priceChange.h24),
      marketCap: parseFloat(mainPair.fdv),
    };
  } catch (err) {
    console.error(`❌ Error fetching Dexscreener for ${tokenAddress}`, err);
    return null;
  }
}
