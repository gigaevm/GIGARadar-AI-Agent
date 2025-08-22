import TelegramBot from "node-telegram-bot-api";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHANNEL_IDS = process.env.TELEGRAM_CHANNEL_ID!; 

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });
export { bot };

export async function sendTelegramMessage(text: string) {
  try {
    if (text.length > 4000) {
      console.warn("⚠️ Telegram message too long, trimming...");
      text = text.slice(0, 3997) + "...";
    }

    const channelIds = TELEGRAM_CHANNEL_IDS.split(",").map(id => id.trim());

    for (const chatId of channelIds) {
      try {
        await bot.sendMessage(chatId, text, {
          parse_mode: "Markdown",
        });
        console.log(`✅ Sent to ${chatId}`);
      } catch (err: any) {
        console.error(`❌ Failed to send to ${chatId}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error("📝 Message content was:\n", text);
    console.error("❌ Unexpected Telegram error:", err.message);
  }
}

export function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
}
