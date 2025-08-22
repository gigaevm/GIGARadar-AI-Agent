import { SeiAgentKit } from "../../agent/index";
import { Address } from "viem";
import { resolveTokenMeta } from "../resolveTokenMetadata";
import axios from "axios";
import * as dotenv from 'dotenv';

dotenv.config();

export async function analyzeToken(

  agent: SeiAgentKit,
  tokenAddress: Address
): Promise<string> {
  console.log(`🤖 Mengambil data Dexscreener untuk: ${tokenAddress}...`);

  const url = `https://api.dexscreener.com/latest/dex/search/?q=${tokenAddress}`;

  try {
    const res = await axios.get(url);
    const data = res.data;
    const pair = data.pairs && data.pairs[0];
    if (!pair) {
      return `❌ Token dengan address ${tokenAddress} tidak ditemukan di Dexscreener.`;
    }

    
    const symbol = pair.baseToken?.symbol || "UNKNOWN";
    const priceUsd = pair.priceUsd || "0";
    const liquidity = pair.liquidity?.usd?.toString() || "0";
    const fdv = pair.fdv?.toString() || "0";
    const marketCap = pair.marketCap?.toString() || "0";
    const volume24h = pair.volume?.h24?.toString() || "0";
    const priceChange1h = pair.priceChange?.h1 || "0";
    const priceChange24h = pair.priceChange?.h24 || "0";

    const analysisData = {
      name: symbol,
      symbol,
      priceUsd,
      liquidity,
      marketCap,
      volume24h,
      priceChange1h,
      priceChange24h,
    };

    console.log(`🧠 Meminta AI analisa shitpost...`);

    const degenReport = await agent.getAiResponse("describe_meme", {
      ...analysisData,
      prompt_hint: `
You are GIGARadar, an AI Telegram bot with a meme-heavy, shitposting, and degen personality.
- List all the details: price, liquidity, volume, market cap, price changes.
- If the data is bad, roast it in a funny way, but don't spread FUD.
- Use meme and degen language.
- End with a disclaimer or meme-style punchline.
`
    });

    const result = `
📊 Token Overview for $${symbol}

💵 Price → $${priceUsd}
💧 Liquidity → $${liquidity}
📈 Volume (24h) → $${volume24h}
🧮 Market Cap → $${marketCap}
🔄 Change (24h) → ${priceChange24h}%

🧠 AI Analysis:
${degenReport}
`.trim();

    return result;

  } catch (error) {
    console.error(`[ANALYZER-ERROR]`, error);
    return "💀 Damn, I got an error when I tried to research the token. Try again later or give me another contract, bro.";
  }
}
