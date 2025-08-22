import { getSeiNews } from "../tools/seiNews";
import {
  predictNewsComment,
  summarizeNewsContent,
} from "../tools/newsCommentGenerator";
import { sendTelegramMessage } from "../utils/telegram";
import {
  wasNewsAlreadyPosted,
  savePostedNews,
  getTodayPostedNewsCount,
} from "../utils/supa";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MAX_POSTS_PER_DAY = 50;
const MAX_POSTS_PER_LOOP = 3;
const GEMINI_CALL_DELAY_MS = 3000;
const POST_DELAY_MS = 4000;

function sanitizeTitle(title: string): string {
  return title
    .replace(/\(@.*?\)/g, "")
    .replace(/[<>]/g, "")
    .trim();
}

function clean(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/[\r\n]+/g, " ")
    .replace(/["']/g, "")
    .replace(/[()]/g, "")
    .replace(/—/g, "-")
    .replace(/\$/g, "USD ")
    .replace(/@/g, "")
    .replace(/\b(shitcoin|fuck|rugpull|scam|rekt)\b/gi, "****")
    .trim();
}

export async function runNewsPosterLoop() {
  console.log("🗞️ [NewsPoster] SEI News AI Agent started...");

  while (true) {
    try {
      const newsItems = await getSeiNews();
      console.log(`🧠 [NewsPoster] ${newsItems.length} SEI news fetched.`);

      const todayCount = await getTodayPostedNewsCount();
      if (todayCount >= MAX_POSTS_PER_DAY) {
        console.log("🔕 [NewsPoster] Daily news limit reached.");
        await sleep(60 * 60 * 1000); // 1 jam
        continue;
      }

      let postedCount = 0;

      for (const item of newsItems) {
        if (postedCount >= MAX_POSTS_PER_LOOP) break;
        if (await wasNewsAlreadyPosted(item.id)) {
          console.log(`🛑 [NewsPoster] Already posted: ${item.title}`);
          continue;
        }

        const cleanTitle = sanitizeTitle(item.title);
        const fullInput = `${cleanTitle}\n\n${item.summary}`;

        await sleep(GEMINI_CALL_DELAY_MS); 
        let summary = "";
        try {
          summary = await summarizeNewsContent(fullInput);
        } catch (err: any) {
          console.warn("⚠️ Failed to summarize:", err.message);
          continue;
        }

        await sleep(GEMINI_CALL_DELAY_MS); 
        let comment = "";
        try {
          comment = await predictNewsComment(fullInput);
        } catch (err: any) {
          console.warn("⚠️ Failed to generate comment:", err.message);
          continue;
        }

        const message = `${clean(cleanTitle)}\n\n${clean(summary)}\n\n${clean(comment)}`;

        try {
          await sendTelegramMessage(message);
        } catch (err: any) {
          console.error("❌ Failed to send Telegram message:", err.message);
          console.error("📝 Message content was:\n", message);
          continue;
        }

        await savePostedNews(item.id, item.title);
        console.log("✅ [NewsPoster] Posted:", item.title);
        postedCount++;

        await sleep(POST_DELAY_MS); 
      }
    } catch (err) {
      console.error("❌ [NewsPoster] Error:", err);
    }

    console.log("⏳ [NewsPoster] Sleeping for 1 hour...");
    await sleep(60 * 60 * 1000); 
  }
}
