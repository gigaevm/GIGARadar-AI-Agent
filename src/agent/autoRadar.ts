console.log("[AUTO-RADAR] loaded!");

import { memeTokens } from "../common/memeTokens";
import { predictMarketV2 } from "../tools/marketPredictor/predictor";
import * as supa from "../utils/supa"; 
import dotenv from "dotenv";
dotenv.config();

console.log("[DEBUG] Sample token object:", memeTokens[0]);

export function loopAutoRadar(bot: any) {
  console.log("🛰️ GigaRadar scanning...");

  async function runLoop() {
    for (const token of memeTokens) {
      const tokenId = token.symbol;
      const pairAddress = token.pairAddress;

      if (!pairAddress) {
        console.log(`⚠️ Skip ${tokenId} → no pairAddress`);
        continue;
      }

      const recentlyPosted = await supa.wasRecentlyPosted(tokenId, 30); // 
      if (recentlyPosted) {
        console.log(`⏱️ Skip ${tokenId} (already posted recently)`);
        continue;
      }

      try {
        const result = await predictMarketV2(pairAddress, token);

        if (result.shouldPost) {
          const fullMessage = `${result.aiComment}`;

          const delay = Math.floor(Math.random() * 4000) + 1000;
          await new Promise((res) => setTimeout(res, delay));

          await bot.sendMessage(
            process.env.AUTO_RADAR_CHAT_ID || process.env.TELEGRAM_CHANNEL_ID!,
            fullMessage,
            { parse_mode: "Markdown" }
          );

          console.log(`✅ POSTED: ${tokenId} (${delay}ms delay)`);
          await supa.savePostHistory(tokenId, result.summary); // 
        } else {
          console.log(`🛑 No alert for ${tokenId} → ${result.reason}`);
        }
      } catch (err) {
        console.error(`❌ Error predicting ${tokenId}:`, err);
      }
    }

    setTimeout(runLoop, 1000 * 60 * 3); // 3 MINUTE
  }

  runLoop();
}
