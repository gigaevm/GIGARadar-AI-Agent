import { Address, createPublicClient, http, formatUnits } from "viem";
import axios from "axios";
import { generateWithRotatingKeys } from "../utils/gemini";
import { memeTokens } from "../common/memeTokens"; 
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
dotenv.config();

console.log("[DEBUG] Loaded memeTokens ✅", memeTokens.length, "tokens");


const erc20Abi = [
  { name: "symbol", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "name", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
];

const seiEvmChain = {
  id: 1329,
  name: "Sei EVM",
  network: "sei",
  nativeCurrency: { decimals: 18, name: "SEI", symbol: "SEI" },
  rpcUrls: { default: { http: ["https://rpc.ankr.com/sei"] } },
  blockExplorers: { default: { name: "Seitrace", url: "https://seitrace.com" } },
};

const publicClient = createPublicClient({
  chain: seiEvmChain,
  transport: http("https://rpc.ankr.com/sei"),
});


export function registerDegenwalletCommand(bot: TelegramBot) {
  bot.onText(/\/degenwallet (0x[a-fA-F0-9]{40})/, async (msg, match) => {
    const chatId = msg.chat.id;
    const wallet: Address = match?.[1] as Address;

    await bot.sendMessage(chatId, `🕵️‍♂️ Scanning wallet: ${wallet}\nPlease wait...`);

    try {
      const holdings = await getTokenHoldings(wallet);

      if (holdings.length === 0) {
        return bot.sendMessage(chatId, "😴 Wallet kosong atau gak ada token meme yang relevan.");
      }

      const enriched = await enrichWithDexInfo(holdings);
      const aiResponse = await analyzeWithAI(enriched);

      return bot.sendMessage(chatId, `📊 Analysis Result:\n\n${aiResponse}`);
    } catch (err) {
      console.error("❌ /degenwallet error:", err);
      return bot.sendMessage(chatId, "💥 Error pas analisa wallet. Coba lagi bentar, bro.");
    }
  });
}


async function getTokenHoldings(wallet: Address) {
  const apiKey = process.env.SEITRACE_API_KEY;
  const holdings = [];

  const tokenParams = memeTokens.map(t => `token_contract_list=${t.address}`).join("&");
  const url = `https://seitrace.com/insights/api/v2/token/erc20/balances?chain_id=pacific-1&address=${wallet}&${tokenParams}`;

  try {
    const res = await axios.get(url, { headers: { "X-Api-Key": apiKey } });
    console.log("[DEBUG] Seitrace response ✅");
    console.log("[DEBUG] Seitrace raw:", JSON.stringify(res.data.data, null, 2));

    const balancesMap = new Map();
    res.data.data?.forEach((t: any) => {
      balancesMap.set(t.token_contract.toLowerCase(), t);
    });

    for (const token of memeTokens) {
      const balanceData = balancesMap.get(token.address.toLowerCase());
      if (balanceData && parseFloat(balanceData.amount) > 0) {
        holdings.push({
          name: balanceData.token_name,
          symbol: balanceData.token_symbol,
          decimals: Number(balanceData.token_decimals),
          balance: balanceData.amount,
          address: token.address,
          pairAddress: token.pairAddress,
          verified: token.verified,
        });
      }
    }
  } catch (err: any) {
    console.warn("❌ Seitrace API failed, fallback to viem...");
    console.error("[DEBUG] Seitrace Error:", err.response?.status, err.response?.data || err.message);

    for (const token of memeTokens) {
      try {
        const [symbol, name, decimals, rawBalance] = await Promise.all([
          publicClient.readContract({ address: token.address, abi: erc20Abi, functionName: "symbol" }),
          publicClient.readContract({ address: token.address, abi: erc20Abi, functionName: "name" }),
          publicClient.readContract({ address: token.address, abi: erc20Abi, functionName: "decimals" }),
          publicClient.readContract({ address: token.address, abi: erc20Abi, functionName: "balanceOf", args: [wallet] }),
        ]);

        const balance = formatUnits(rawBalance as bigint, decimals as number);
        if (parseFloat(balance) > 0) {
          holdings.push({
            name: name as string,
            symbol: symbol as string,
            decimals: decimals as number,
            balance,
            address: token.address,
            pairAddress: token.pairAddress,
            verified: token.verified,
          });
        }
      } catch (e) {
        console.warn(`⚠️ Failed token ${token.symbol}`);
      }
    }
  }

  return holdings;
}


async function enrichWithDexInfo(holdings: any[]) {
  const enriched = await Promise.all(
    holdings.map(async (token) => {
      try {
        const res = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${token.address}`);
        const pairData = res.data.pairs?.find((p: any) => p.pairAddress.toLowerCase() === token.pairAddress.toLowerCase());

        return {
          ...token,
          priceUsd: pairData?.priceUsd || "0",
          liquidityUsd: pairData?.liquidity?.usd?.toString() || "0",
          fdv: pairData?.fdv?.toString() || "0",
          volume24h: pairData?.volume?.h24?.toString() || "0",
          priceChange24h: pairData?.priceChange?.h24 || "0",
        };
      } catch (e) {
        console.warn(`❌ Dex error ${token.symbol}`);
        return { ...token, priceUsd: "0", liquidityUsd: "0", fdv: "0", volume24h: "0", priceChange24h: "0" };
      }
    })
  );

  return enriched;
}


async function analyzeWithAI(tokens: any[]) {
  const prompt = `You're a meme-loving degen crypto AI. Analyze these tokens and give BUY/HOLD/SELL with shitpost:
${tokens.map(t => `\n$${t.symbol}: ${t.balance} tokens | Price: $${t.priceUsd} | Liquidity: $${t.liquidityUsd} | 24h Vol: $${t.volume24h} | Change: ${t.priceChange24h}%`).join("\n")}

Respond in pure meme style.`;

  const aiResult = await generateWithRotatingKeys(prompt);
  return aiResult.trim();
}
