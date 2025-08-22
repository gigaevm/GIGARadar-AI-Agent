import { memeTokens } from "../../common/memeTokens";

type RecapResult = {
  gainers: string;
  losers: string;
};

export async function getMarketRecap(): Promise<RecapResult> {
  const tokenData = [];

  for (const token of memeTokens) {
    try {
      const res = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${token.address}`
      );
      const json = await res.json();
      const pair = json.pairs?.[0];

      if (!pair) continue;

      const change = parseFloat(pair.priceChange?.h24 || "0");
      const price = parseFloat(pair.priceUsd || "0").toFixed(4);
      const volume = parseFloat(pair.volume?.h24 || "0").toLocaleString();

      tokenData.push({
        symbol: token.symbol,
        change,
        price,
        volume,
      });
    } catch (err) {
      console.error("Error fetching", token.symbol, err);
    }
  }

  const sorted = tokenData.sort((a, b) => b.change - a.change);
  const topGainers = sorted.slice(0, 3);
  const topLosers = sorted.slice(-3).reverse();

  const format = (list: typeof tokenData) =>
    list
      .map(
        (t) =>
          `• *${t.symbol}* – $${t.price} (${t.change > 0 ? "+" : ""}${t.change}% | Vol: $${t.volume})`
      )
      .join("\n");

  return {
    gainers: `📈 *Top 3 Gainers*\n\n${format(topGainers)}`,
    losers: `📉 *Top 3 Losers*\n\n${format(topLosers)}`,
  };
}
