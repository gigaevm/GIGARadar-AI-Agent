import { getLiveTriggers } from "../tools/liveTriggers"; 
import { predictMarketV2 } from "../tools/marketPredictor/predictor";
import { sendTelegramMessage } from "../utils/telegram";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runLiveTriggerPosterLoop() {
  console.log("⚡ [LiveTrigger] Live-trigger AI Agent started...");

  while (true) {
    try {
      const triggers = await getLiveTriggers();
      if (triggers.length > 0) {
        console.log(`🚨 [LiveTrigger] ${triggers.length} new hype signals found!`);
      }

      for (const t of triggers) {
        const result = await predictMarketV2(t.pair);
        if (result.shouldPost) {
          const message = `📡 *Live Signal for $${t.symbol}*\n\n${result.aiComment}`;
          await sendTelegramMessage(message);
          console.log(`✅ [LiveTrigger] Posted $${t.symbol}`);
        } else {
          console.log(`⚠️ [LiveTrigger] Skip $${t.symbol}: ${result.reason}`);
        }
        await sleep(2500);
      }
    } catch (err) {
      console.error("❌ [LiveTrigger] Error:", err);
    }

    await sleep(60 * 1000);
  }
}
