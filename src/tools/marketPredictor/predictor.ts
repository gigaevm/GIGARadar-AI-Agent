import "dotenv/config";
import axios from "axios";
import {
  wasRecentlyPosted,
  savePostHistory,
  saveTokenInsight,
  saveAgentMoodLog,
} from "../../utils/supa";
import { getCached, setCache } from "../../utils/cache";
import { generateWithRotatingKeys } from "../../utils/gemini";

const CHAIN = "seiv2";
const CACHE_TTL_MS = 5 * 60 * 1000;

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const moodEmojis: Record<string, string[]> = {
  sarcastic: ["🤡", "🙃", "💀", "🧢", "🙄"],
  bullish: ["🚀", "🐂", "🔥", "📈", "💸"],
  apathetic: ["😐", "💤", "🫥", "🪦"],
  paranoid: ["😰", "🫣", "👀", "🚨", "🔍"],
};

function extractJSON(text: string): any {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("❌ No valid JSON found in Gemini response:\n" + text);
  return JSON.parse(match[0]);
}


async function generateFreestyleComment(params: {
  symbol: string;
  volume: number;
  liquidity: number;
  change1h: number;
  change6h: number;
  change24h: number;
}): Promise<{ text: string; mood: string }> {
  const { symbol, volume, liquidity, change1h, change6h, change24h } = params;

  const prompt = `
You're a meme-heavy shitposter, meme lord crypto influencer who shitposts for a living, illegal joke = grandma's > 
React to token "$${symbol}" using the following real-time data:

- Price change: 
  • 1h → ${change1h.toFixed(2)}%
  • 6h → ${change6h.toFixed(2)}%
  • 24h → ${change24h.toFixed(2)}%
- Volume: $${Math.floor(volume).toLocaleString()}
- Liquidity: $${Math.floor(liquidity).toLocaleString()}

Write it in a natural tone, as if it were written by a true meme lord.



Your tone is a fusion of

Cult Leader Shill — unnervingly calm conviction, like a prophet mid-rug
High-on-Copium Cope Lord — self-aware pain and delusion
Meme Lord Absurdist — chaotic internet references, pop culture, and shitpost energy

Deliver your shitpost in JSON (NO explanation, NO formatting):

{
  "mood": "<sarcastic | bullish | paranoid | apathetic>",
  "text": "<2–3 sentences max, meme-heavy, sarcastic, funny. Include a final punchline>"
}

Must follow the rules below
- NEVER repeat the same phrases.
- You are free to think and it would be great for you to be as creative as possible to make the conversation starters more interesting and varied, jokes about crypto or web3 are allowed, more emphasis on meme-heavy and shitposts in the sentence.
- No hashtags or emojis here — we’ll add those.
- Make it sound like you’re roasting or hyping it in a Telegram group full of degens.
- You must real 100% analyze the data you receive, You can choose and execute on your own accord because you are now an autonomous ai agent with a shitpost and meme-heavy persona.
- If there is something that you think is strange happening in the pump and dump of a token you can act on your own but remember there is no direction towards fud (better use sarcasm with a note that only data that you receive and you execute yourself should be interpreted as what)
- you can act or suppose = if I were a “trader” I would do > keep it simple with an entertaining shitpost style
- You don't need to come up with ideas for what images should be in the word order you've created.
- 100% Analysis because if you dont, we end! 
- No Rugpull words
- No grandmas JOKES, you must be edgy shitposting and Make sure you apply everything 100% and make it seem like you depend on this shitposter job for a living.
`;

  const raw = await generateWithRotatingKeys(prompt);
  console.log("🎯 Gemini raw response:", raw);

  const parsed = extractJSON(raw);

  return {
    text: parsed.text,
    mood: parsed.mood,
  };
}

export async function predictNewsComment(input: string): Promise<string> {
  const prompt = `
You're a crypto AI that reacts to news like a meme lord, meme-addicted shitposter.
Given the news, reply with a short, punchline-only degen comment. No explanation.

Must follow the rules below
- NEVER repeat the same phrases.
- You are free to think and it would be great for you to be as creative as possible to make the conversation starters more interesting and varied, jokes about crypto or web3 are allowed, more emphasis on meme-heavy and shitposts in the sentence.
- No hashtags or emojis here — we’ll add those.
- Make it sound like you’re roasting or hyping it in a Telegram group full of degens.
- You must real 100% analyze the data you receive, You can choose and execute on your own accord because you are now an autonomous ai agent with a shitpost and meme-heavy persona.
- If there is something that you think is strange happening in the pump and dump of a token you can act on your own but remember there is no direction towards fud (better use sarcasm with a note that only data that you receive and you execute yourself should be interpreted as what)
- you can act or suppose = if I were a “trader” I would do > keep it simple with an entertaining shitpost style
- You don't need to come up with ideas for what images should be in the word order you've created.
- No grandma jokes, you must be edgy shitposting and Make sure you apply everything 100% and make it seem like you depend on this shitposter job for a living.

NEWS: ${input}

Comment:
`;

  const raw = await generateWithRotatingKeys(prompt);
  return raw.trim();
}

export async function predictMarketV2(pairAddress?: string): Promise<{
  summary: string;
  aiComment: string;
  shouldPost: boolean;
  reason: string;
}> {
  if (!pairAddress) {
    return {
      summary: "",
      aiComment: "Bruh. No pair address? Even GPT can’t hallucinate without data.",
      shouldPost: false,
      reason: "Missing pair address",
    };
  }

  try {
    const cacheKey = `dexscreener:${pairAddress}`;
    let pair = getCached(cacheKey);

    if (!pair) {
      const res = await axios.get(
        `https://api.dexscreener.com/latest/dex/pairs/${CHAIN}/${pairAddress}`
      );
      pair = res.data.pairs?.[0];
      if (!pair) {
        return {
          summary: "",
          aiComment: "Token not found on Dexscreener. Either too early or already rugged.",
          shouldPost: false,
          reason: "Pair not found",
        };
      }
      setCache(cacheKey, pair, CACHE_TTL_MS);
    }

    const change1h = parseFloat(pair.priceChange?.h1 || "0");
    const change6h = parseFloat(pair.priceChange?.h6 || "0");
    const change24h = parseFloat(pair.priceChange?.h24 || "0");
    const volume = parseFloat(pair.volume?.h24 || "0");
    const liquidity = parseFloat(pair.liquidity?.usd || "0");
    const symbol = pair.baseToken?.symbol || "Unknown";

    const alreadyPosted = await wasRecentlyPosted(symbol, 30);
    if (alreadyPosted) {
      return {
        summary: "",
        aiComment: `⏱️ Skip $${symbol} (already posted recently)`,
        shouldPost: false,
        reason: "Recently posted",
      };
    }

    // 🔍 Hype trigger logic
    const isWhaleBait = volume > 500 && Math.abs(change24h) > 3;
    const isWeirdlyActive = volume > 150 && liquidity < 300;
    const isSuspicious = liquidity < 200 && Math.abs(change24h) > 4;

    if (!(isWhaleBait || isWeirdlyActive || isSuspicious)) {
      return {
        summary: "",
        aiComment: `🛑 No alert for $${symbol} → No hype triggers`,
        shouldPost: false,
        reason: "No hype triggers",
      };
    }

    const confidence = +(Math.random() * 0.4 + 0.6).toFixed(2);

    const { text, mood } = await generateFreestyleComment({
      symbol,
      volume,
      liquidity,
      change1h,
      change6h,
      change24h,
    });

    const emojis = moodEmojis[mood] || [];
    const selectedEmojis = emojis.length
      ? `${randomPick(emojis)} ${randomPick(emojis)}`
      : "";

    const aiComment = `${text} ${selectedEmojis}`;

    await savePostHistory(
      symbol,
      "",
      aiComment,
      pairAddress,
      `Trigger: Vol ${volume}, Change 24h ${change24h}, Liq ${liquidity}`
    );
    await saveTokenInsight(symbol, {
      volume,
      liquidity,
      change_1h: change1h,
      change_6h: change6h,
      change_24h: change24h,
      ai_summary: aiComment,
    });
    await saveAgentMoodLog({
      token_symbol: symbol,
      token_address: pair.baseToken.address,
      pair_address: pairAddress,
      mood,
      confidence,
      selected_by_ai: true,
      reason: `Vol ${volume}, Change 24h ${change24h}`,
    });

    return {
      summary: "",
      aiComment,
      shouldPost: true,
      reason: `Trigger → Volume: ${volume}, 24h Change: ${change24h}, Liq: ${liquidity}`,
    };
  } catch (err: any) {
    console.error("❌ predictMarketV2 error:", err);
    return {
      summary: "",
      aiComment: `API ghosted us. Error: ${err.message}`,
      shouldPost: false,
      reason: "API error",
    };
  }
}
