// src/agent/moverPoster.ts
import { getTopMovers } from "../tools/topMovers";
import { predictMarketV2 } from "../tools/marketPredictor/predictor";
import { memeTokens } from "../common/memeTokens";
import { sendTelegramMessage } from "../utils/telegram";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runMoverPosterLoop() {
  console.log("🚀 Starting moverPoster agent...");
  while (true) {
    try {
      const movers = await getTopMovers();
      console.log(`📊 Found ${movers.length} movers`);

      for (const mover of movers) {
        const tokenInfo = memeTokens.find(
          (t) => t.symbol.toLowerCase() === mover.symbol.toLowerCase()
        );

        if (!tokenInfo) {
          console.log(`⚠️ Token ${mover.symbol} not in memeTokens`);
          continue;
        }

        const result = await predictMarketV2(tokenInfo.pair);

        if (result.shouldPost) {
          const fullMessage = `📢 *$${mover.symbol} ALERT*\n\n${result.aiComment}`;
          await sendTelegramMessage(fullMessage);
          console.log(`✅ Posted $${mover.symbol}`);
        } else {
          console.log(`⏭️ Skip $${mover.symbol}: ${result.reason}`);
        }

        await sleep(3000); 
      }
    } catch (err) {
      console.error("❌ moverPosterLoop error:", err);
    }

    console.log("⏳ Sleeping for 1 hour...");
    await sleep(60 * 60 * 1000); 
  }
}
