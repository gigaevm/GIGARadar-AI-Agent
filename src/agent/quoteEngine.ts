import axios from "axios";
import { memeTokens } from "../common/memeTokens";
import { bot } from "../bot";

console.log("[QUOTE-ENGINE] Loaded.");

const CHAIN = "seiv2"; // default chain

export function loopShitpostQuotes(bot: any) {
  async function runLoop() {
    try {
      
      const validTokens = memeTokens.filter((t) => t.pairAddress?.startsWith("sei1"));
      const token = validTokens[Math.floor(Math.random() * validTokens.length)];

      if (!token || !token.pairAddress) {
        console.warn("⚠️ No valid token found.");
        return;
      }

      
      const res = await axios.get(`https://api.dexscreener.com/latest/dex/pairs/${CHAIN}/${token.pairAddress}`);
      const pair = res.data?.pair;

      if (!pair) {
        console.warn(`❌ Dexscreener fetch error: No data for ${token.symbol}`);
        return;
      }

      
      const prompt = `
You are a meme-heavy crypto analyst. Write a shitpost quote about this token:

Name: ${token.name} ($${token.symbol})
Price: $${parseFloat(pair.priceUsd || "0").toFixed(4)}
24h Change: ${pair.priceChange?.h24 || "0"}%
Volume: $${parseFloat(pair.volume?.h24 || "0").toLocaleString()}
Liquidity: $${parseFloat(pair.liquidity?.usd || "0").toLocaleString()}

Rules:
- Use meme language
- Degen-style
- Be short, wild, but not financial advice
- No generic bland text
`;

      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const quote = response.text();

      // ✅ Kirim ke Telegram
      const message = `💬 *$${token.symbol} Quote of the Moment:*\n\n${quote}`;
      await bot.sendMessage(
        process.env.QUOTE_CHAT_ID || process.env.TELEGRAM_CHANNEL_ID!,
        message,
        { parse_mode: "Markdown" }
      );

      console.log(`✅ Posted quote for $${token.symbol}`);
    } catch (err: any) {
      console.error("❌ Quote Engine error:", err.message);
    }

    setTimeout(runLoop, 1000 * 60 * 3); 
  }

  runLoop();
}
