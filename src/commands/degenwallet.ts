import axios from "axios";
import TelegramBot from "node-telegram-bot-api";
import { Address, formatUnits, parseAbi, createPublicClient, http } from "viem";
import { defineChain } from "viem/utils";
import { memeTokens } from "../common/memeTokens";
import { generateWithRotatingKeys } from "../utils/gemini";


const seiEvm = defineChain({ id: 1329, name: "Sei EVM", network: "sei-evm", nativeCurrency: { name: "SEI", symbol: "SEI", decimals: 18 }, rpcUrls: { default: { http: ["https://evm-rpc.sei-apis.com"] } } });

const publicClient = createPublicClient({
    chain: seiEvm,
    transport: http(undefined, {
        batch: true,
    }),
});

const erc20Abi = parseAbi(["function balanceOf(address owner) view returns (uint256)", "function decimals() view returns (uint8)"]);



async function getHoldingsViaViem(wallet: Address): Promise<{ address: Address; balance: bigint }[]> {
    console.log(`[degenWallet] Using new strategy (Promise.all) for: ${wallet}`);
    
    const balancePromises = memeTokens.map(token => 
        publicClient.readContract({
            address: token.address as Address,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [wallet],
        }).then(balance => ({
            status: 'fulfilled',
            address: token.address as Address,
            balance: balance,
        })).catch(error => ({
            status: 'rejected',
            address: token.address as Address,
            reason: error,
        }))
    );

    const results = await Promise.all(balancePromises);

    const holdings = [];
    for (const result of results) {
        if (result.status === 'fulfilled' && result.balance > 0n) {
            holdings.push({
                address: result.address,
                balance: result.balance,
            });
        }
    }
    
    console.log(`[degenWallet] Found ${holdings.length} tracked tokens in wallet using new strategy.`);
    return holdings;
}


async function enrichWithDexscreener(pairAddress: string): Promise<any> {
    try {
        const url = `https://api.dexscreener.com/latest/dex/pairs/seiv2/${pairAddress}`;
        const response = await axios.get(url);
        if (response.data && response.data.pair) {
            return response.data.pair;
        }
        return null;
    } catch (error) {
        return null;
    }
}


async function getDegenCommanderTake(dossier: any): Promise<string> {
    const change5m = dossier.priceChange?.m5 ?? 0;
    const change24h = dossier.priceChange?.h24 ?? 0;
    const volume24h = dossier.volume?.h24 ?? 0;
    const liquidity = dossier.liquidity?.usd ?? 0;

    let momentum_5m_sentiment: string;
    if (change5m > 2) momentum_5m_sentiment = "PUMPING HARD NOW";
    else if (change5m < -2) momentum_5m_sentiment = "DUMPING HARD NOW";
    else momentum_5m_sentiment = "FLATLINING";

    let volume_sentiment: string;
    if (volume24h > 50000) volume_sentiment = "INSANE VOLUME";
    else if (volume24h < 1000) volume_sentiment = "DESERT-DRY VOLUME";
    else volume_sentiment = "DECENT VOLUME";
    
    const fullPrompt = `You are Meme Lord, Shitposter, an unhinged legendary crypto trader giving direct commands: BUY, HOLD, or SELL.
You will receive a pre-analyzed dossier. Your job is to turn this into an unhinged, shitpost-style and meme-heavy command.

**YOUR LOGIC TREE:**
- **IF 5m_Trend is PUMPING and Volume is INSANE, command BUY.** Call it a "rocket launch."
- **IF 24h_Trend is DUMPING but 5m_Trend is PUMPING, command BUY.** Call it a "GIGACHAD dip buy."
- **IF 5m_Trend is DUMPING, command SELL.** Call it a "sinking ship" or "securing the bag."
- **IF 5m_Trend is FLATLINING but 24h_Trend is PUMPING, command HOLD.** Call it "diamond handing through the chop."
- **IF Liquidity is very low (less than $2000), you MUST add a warning about rug pull risk but by not directly mentioning “rug pull” use shitpost and meme-heavy words so as not to offend.**

**RULES:**
1. Your response MUST start with **BUY**, **HOLD**, or **SELL**.
2. Your reasoning MUST be a 1-2 sentence shitpost.
3. Jump STRAIGHT to the command. No intros. No explanations. No dossiers. Just the command and the shitpost.
4. No FUD / No rug pull word! 

---
HERE IS THE DOSSIER. EXECUTE YOUR COMMAND.
---

Dossier for $${dossier.symbol}:
- 24h_Trend: ${change24h.toFixed(2)}%
- 5m_Trend: ${momentum_5m_sentiment} (${change5m.toFixed(2)}%)
- Volume_Sentiment: ${volume_sentiment} ($${volume24h.toLocaleString()})
- Liquidity: $${liquidity.toLocaleString()}

COMMAND:`;

    try {
        const aiResponse = await generateWithRotatingKeys(fullPrompt);
        return aiResponse;
    } catch (e: any) {
        console.error("[degenWallet] AI generation failed:", e.message);
        return "**HOLD** because the AI oracle is currently rugged. Don't panic.";
    }
}
  
export async function analyzeWallet(wallet: Address): Promise<string> {
    const holdings = await getHoldingsViaViem(wallet);
    if (!holdings || holdings.length === 0) return `⚠️ This wallet is a ghost town or holds no tracked meme tokens.`;

    const analysisPromises = holdings.map(async (holding) => {
      const tokenMeta = memeTokens.find(t => t.address.toLowerCase() === holding.address.toLowerCase());
      if (!tokenMeta || !tokenMeta.pairAddress) return null;
  
      const dexscreenerData = await enrichWithDexscreener(tokenMeta.pairAddress);
      if (!dexscreenerData || !dexscreenerData.priceUsd) return null;

      const decimals = tokenMeta.decimals ?? 18;
      const formattedBalance = formatUnits(holding.balance, decimals);
      const valueUsd = Number(formattedBalance) * Number(dexscreenerData.priceUsd);
      
      const dossierObject = {
        name: tokenMeta.name,
        symbol: tokenMeta.symbol,
        ...dexscreenerData,
      };
      
      const aiCommand = await getDegenCommanderTake(dossierObject);
  
      const change24h = dexscreenerData.priceChange?.h24 ?? 0;
      const change1h = dexscreenerData.priceChange?.h1 ?? 0;
      const change5m = dexscreenerData.priceChange?.m5 ?? 0;
      const volume24h = dexscreenerData.volume?.h24 ?? 0;

      return `
📊 *${tokenMeta.name} ($${tokenMeta.symbol})*
Value: *$${valueUsd.toFixed(2)}* | 24h: *${change24h.toFixed(2)}%*
Momentum: *${change1h.toFixed(2)}%* (1h) | *${change5m.toFixed(2)}%* (5m)
Volume (24h): *$${volume24h.toLocaleString()}*
📈 *COMMANDER'S CALL:* ${aiCommand}
      `;
    });

    const results = (await Promise.all(analysisPromises)).filter(s => s !== null);
  
    if (results.length === 0) return `⚠️ No tracked meme tokens with price data found in this wallet.`;
    return results.join("\n---------------------\n");
}
  
export function registerDegenwalletCommand(bot: TelegramBot) {
    bot.onText(/\/degenwallet (0x[a-fA-F0-9]{40})/, async (msg, match) => {
      const chatId = msg.chat.id;
      if (!match || !match[1]) {
          bot.sendMessage(chatId, "Bro, give me a valid wallet address. Usage: /degenwallet 0x...");
          return;
      }
      const wallet = match[1] as Address;
  
      bot.sendMessage(chatId, `\`\`\`
DEGEN COMMANDER ON DECK...
TARGET: ${wallet}
ANALYZING BATTLEFIELD DATA...
PLEASE WAIT...
\`\`\``, { parse_mode: "Markdown" });
  
      try {
        const result = await analyzeWallet(wallet);
        bot.sendMessage(chatId, result, { parse_mode: "Markdown", disable_web_page_preview: true });
      } catch (err: any) { 
        console.error("[ERROR] analyzeWallet failed:", err.message);
        bot.sendMessage(chatId, "❌ Scan failed. The chain is congested or the AI is on a smoke break. Try again.");
      }
    });
}
