import * as dotenv from 'dotenv';
import path from 'path';
import { loopAutoRadar } from "./agent/autoRadar";
console.log('Farming Analyzer Path:', path.resolve(__dirname, './tools/farmingAnalyzer'));
import TelegramBot from 'node-telegram-bot-api';
import { Address } from 'viem';
import cron from 'node-cron';
import { supabase } from "./utils/supa";
import { memeTokens } from "./common/memeTokens";
import { SeiAgentKit } from './agent/index';
import { analyzeToken } from './tools/tokenAnalyzer/tokenAnalyzer';
import { reportOnWallet } from './tools/walletReporter/walletReporter';
import { setUserRiskProfile, getUserRiskProfile } from './tools/defi_agent/riskProfileManager';
import { getMarketRecap } from "./tools/marketRecap/marketRecap";
import { handleWhaleWatch } from './tools/whaleActivityWatcher';
import { walletAdvisorAgent } from './agent/walletAdvisorAgent';
import { loopShitpostQuotes } from "./agent/quoteEngine";
import { runMoverPosterLoop } from "./agent/moverPoster";
import { runLiveTriggerPosterLoop } from "./agent/liveTriggerPoster";
import { runNewsPosterLoop } from "./agent/newsPoster";
import { walletWhisperCommand } from "./commands/walletWhisperCommand";
import { registerDegenwalletCommand } from "./commands/degenWallet";

dotenv.config({ override: true });


const token = process.env.TELEGRAM_BOT_TOKEN;
const privateKey = process.env.SEI_PRIVATE_KEY;

if (!token || !privateKey) throw new Error("❌ TELEGRAM_BOT_TOKEN and SEI_PRIVATE_KEY are required in .env!");

const agent = new SeiAgentKit(`0x${privateKey}`);
const bot = new TelegramBot(token, { polling: true });
export { bot };
loopShitpostQuotes(bot);

console.log("🔥 SEI-Sage Bot is online and ready to degen!");

// Escape Markdown
function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

function splitMessage(text: string, chunkSize = 4000): string[] {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
}

function sendSafeMessage(bot: TelegramBot, chatId: number | string, message: string) {
  const chunks = splitMessage(message);
  for (const chunk of chunks) {
    bot.sendMessage(chatId, chunk);
  }
}

(async () => {
  const { data, error } = await supabase.from("post_history").select("*").limit(1);
  if (error) {
    console.error("❌ Supabase error:", error.message);
    return;
  }
  console.log("✅ Supabase connected, sample data:", data);

  console.log("🤖 AI Agent Bot starting...");

  // Start mover agent (Top Gainers & Losers)
  runMoverPosterLoop();

  // Start live trigger agent (Fast price changes)
  runLiveTriggerPosterLoop();

  // Start SEI News poster agent
  runNewsPosterLoop();
})();

// --- COMMANDS ---

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "WELCOME TO GIGARADAR. Type /help to see what I can do.");
});

bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;

  const helpMessage = `
📟 *GIGAradar Command Menu* 📟

Your AI degen overlord is online.
The memes are unhinged; the analysis is real.

Manual Commands

⚔️ /degenwallet <wallet>
> Tells you if you're holding gems or nothing (Warning: may hurt your feelings.)

🧪 /analyze_token <token>
> AI analysis for any token on $SEI

📊 /balance <wallet>
> Peeking into wallets like a degen IRS agent .See how much money you’re bagholding.

📰 /daily_recap
> See 3 Top Gainers & 3 Top Losers

🤖 Autonomous Mode
> Get a fast signal and catch a momentum, join our channel below!

---

⚠️ *Disclaimer*: This bot is NOT your financial advisor. It's your emotionally unstable degen cousin yelling “WAGMI” at 3AM.

Stay based. Stay unhinged. 🐒🚀

Channel = https://t.me/gigaradarsei
  `;
  bot.sendMessage(msg.chat.id, helpMessage, { parse_mode: 'Markdown' });
});

bot.onText(/\/analyze_token (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const contractAddress = match?.[1].trim();

  if (!contractAddress?.startsWith('0x')) {
    bot.sendMessage(chatId, "Wrong format, ser. Gimme the CA. Example: /analyze_token 0x...", { parse_mode: 'Markdown' });
    return;
  }

  try {
    await bot.sendMessage(chatId, "🤖 Crunching degen vibes with my AI brain...");
    const degenAnalysis = await analyzeToken(agent, contractAddress as Address);

    await bot.sendMessage(
      chatId,
      escapeMarkdown(`🔥 Giga Radar Analysis\n\n${degenAnalysis}`),
      { parse_mode: 'MarkdownV2' }
    );

  } catch (err) {
    console.error("Error in /analyze_token:", err);
    bot.sendMessage(chatId, "Sheesh, something went wrong. The chain might be hangover. Try again later.");
  }
});

bot.onText(/\/wallet_advice (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const walletAddress = match?.[1];

  if (!walletAddress) {
    bot.sendMessage(chatId, "❌ Bro, you gotta drop a wallet address.\nExample: /wallet_advice 0x...");
    return;
  }

  bot.sendMessage(chatId, `🔍 Fetching degen wisdom for wallet:\n\`${walletAddress}\``, { parse_mode: "Markdown" });

  const report = await getWalletAdvice(walletAddress);

  bot.sendMessage(chatId, report, { parse_mode: "Markdown" });
});

bot.onText(/\/daily_recap/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "📡 Fetching market data...");

  try {
    const { gainers, losers, tokenData } = await getMarketRecap();

    await bot.sendMessage(chatId, gainers, { parse_mode: "Markdown" });
    await bot.sendMessage(chatId, losers, { parse_mode: "Markdown" });

    const aiInput = {
      summary: {
        gainers,
        losers,
        totalCount: memeTokens.length,
        generatedAt: new Date().toISOString(),
      },
      tokens: tokenData,
      instructions: `
You are GIGAradar, a meme-heavy, shitposting, degen crypto analyst.

Guidelines:
- If token is verified, no FUD.
- If 24h volume > $500,000, do NOT call it scam or rug.
- If 24h change < -30%, roast gently.
- Mention exact price and volume.
- No financial advice.
- Always close with a meme punchline.`
    };

    const aiCommentary = await agent.getAiResponse("meme_market_analyst", aiInput);

    await bot.sendMessage(chatId, `🤖 *AI Commentary*\n\n${aiCommentary}`, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("❌ Error in /daily_recap:", error);
    bot.sendMessage(chatId, "❌ Error getting recap data. Try again later.");
  }
});

bot.onText(/\/balance (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const walletAddress = match?.[1].trim();

  if (!walletAddress?.startsWith('0x')) {
    bot.sendMessage(chatId, "Wrong format, ser. Gimme a wallet address. Example: /balance 0x...", { parse_mode: 'Markdown' });
    return;
  }

  try {
    await bot.sendMessage(chatId, "Aight, checking your wallet... hope you're not broke. 👀");
    const walletReport = await reportOnWallet(agent, walletAddress as Address);
    await bot.sendMessage(chatId, walletReport.header, { parse_mode: 'Markdown' });

    await new Promise(res => setTimeout(res, 1000));
    const roast = await agent.getAiResponse('roast_wallet', walletReport.roastData);
    await bot.sendMessage(chatId, `🔥 *Yapping Time*\n\n${roast}`, { parse_mode: 'Markdown' });

  } catch (err) {
    console.error("Error in /balance:", err);
    bot.sendMessage(chatId, "Sheesh, couldn't check the wallet. You sure that's the right address?");
  }
});


bot.onText(/^\/whisper(?:\s+(.+))?/, async (msg, match) => {
  const args = match?.[1]?.split(" ") || [];
  const chatId = msg.chat.id;

  await walletWhisperCommand(bot, chatId, args);
});

bot.onText(/\/set_risk (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const level = match?.[1].toLowerCase().trim();

  if (!['low', 'medium', 'high'].includes(level || '')) {
    bot.sendMessage(chatId, "Invalid risk level. Use: /set_risk low | medium | high");
    return;
  }

  const success = setUserRiskProfile(chatId, level as 'low' | 'medium' | 'high');
  if (success) {
    bot.sendMessage(chatId, `✅ Got it! Your risk level is now set to *${level?.toUpperCase()}*`, { parse_mode: 'Markdown' });
  } else {
    bot.sendMessage(chatId, "❌ Couldn't save your risk profile. Please try again.");
  }
});

bot.onText(/\/my_risk/, (msg) => {
  const chatId = msg.chat.id;
  const risk = getUserRiskProfile(chatId);

  if (!risk) {
    bot.sendMessage(chatId, "You haven’t set your risk level yet. Use /set_risk low|medium|high", { parse_mode: 'Markdown' });
  } else {
    bot.sendMessage(chatId, `🎯 Your current risk profile is *${risk.toUpperCase()}*`, { parse_mode: 'Markdown' });
  }
});

bot.onText(/\/debug_whale/, async (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "🐋 Testing Whale Watch manually...");

  try {
    await handleWhaleWatch();
    bot.sendMessage(chatId, "✅ Whale Watch run completed.");
  } catch (err) {
    console.error("❌ Whale debug failed:", err);
    bot.sendMessage(chatId, "❌ Whale Watch test failed. Check logs.");
  }
});

// AUTO-RADAR LOOP
import { runLiveTriggerPosterLoop } from "./agent/liveTriggerPoster";
import "./agent/autoRadar";
loopAutoRadar(bot);
runLiveTriggerPosterLoop();
registerDegenwalletCommand(bot);

