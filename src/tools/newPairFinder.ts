// tools/newPairFinder.ts

import axios from 'axios';
import { supabase } from '../utils/supa';
import { generateWithRotatingKeys } from '../utils/gemini';
import { setCache, getCached } from '../utils/cache';

const CHAIN = "seiv2";

async function wasPairSeen(pairAddress: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('seen_pairs')
    .select('pair_address')
    .eq('pair_address', pairAddress)
    .single(); 

  if (error && error.code !== 'PGRST116') {
    
    console.error(`[newPairFinder] Error checking Supabase:`, error);
    return true; 
  }

  return !!data; 
}


async function saveNewPair(pairAddress: string): Promise<void> {
  const { error } = await supabase
    .from('seen_pairs')
    .insert({ pair_address: pairAddress });

  if (error) {
    console.error(`[newPairFinder] Error saving new pair to Supabase:`, error);
  }
}


async function generateNewPairJudgement(pair: any): Promise<{ shouldPost: boolean; comment: string }> {
  const { baseToken, liquidity, pairCreatedAt } = pair;

  const prompt = `
You are an autonomous AI agent, a degen crypto scout named "GIGARadar".
Your job is to spot newly created token pairs and judge if they are interesting enough to be shared.
You must be very skeptical. 99% of new pairs are scams or will die instantly.

Here is the data for a brand new pair:
- Token Name: "${baseToken.name}"
- Token Symbol: "$${baseToken.symbol}"
- Initial Liquidity (USD): $${liquidity.usd.toFixed(2)}
- Pair Created At: ${new Date(pairCreatedAt).toUTCString()}

Analyze this. Is it worth a small, speculative gamble for degens?

RULES:
- If liquidity is less than $1000, almost always say NO unless the name is extremely funny or interesting.
- Be very critical of generic or scammy names.
- Your response MUST be in JSON format, with no other text.

JSON response format:
{
  "shouldPost": <true or false>,
  "comment": "<Your 1-2 sentence degen-style commentary. If shouldPost is false, explain why in a cynical way. If true, hype it up but remind people it's super risky.>"
}
`;

  try {
    const rawResponse = await generateWithRotatingKeys(prompt);
    
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[newPairFinder] AI did not return valid JSON:", rawResponse);
      return { shouldPost: false, comment: "AI is sleeping on the job." };
    }
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("[newPairFinder] Error getting judgement from AI:", error);
    return { shouldPost: false, comment: "AI is having a breakdown." };
  }
}


export async function processNewPair(pair: any): Promise<{ shouldPost: boolean; message: string }> {
  const pairAddress = pair.pairAddress;

  
  const seen = await wasPairSeen(pairAddress);
  if (seen) {
    
    console.log(`[newPairFinder] Skipping seen pair: $${pair.baseToken.symbol} (${pairAddress.slice(0, 6)})`);
    return { shouldPost: false, message: "" };
  }

  
  console.log(`[newPairFinder] ✨ New pair found! $${pair.baseToken.symbol}. Saving to memory...`);
  await saveNewPair(pairAddress);

  
  console.log(`[newPairFinder] Asking AI for judgement on $${pair.baseToken.symbol}...`);
  const { shouldPost, comment } = await generateNewPairJudgement(pair);

  if (!shouldPost) {
    console.log(`[newPairFinder] AI decided to SKIP $${pair.baseToken.symbol}. Reason: ${comment}`);
    return { shouldPost: false, message: "" };
  }

  
  console.log(`[newPairFinder] AI approved POST for $${pair.baseToken.symbol}!`);

  const message = `
  🚨 **New Alpha Detected by AI** 🚨

  ${comment}

  **Token:** ${pair.baseToken.name} ($${pair.baseToken.symbol})
  **Liquidity:** $${parseFloat(pair.liquidity.usd).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
  
  **Chart:** [DexScreener](https://dexscreener.com/sei/${pairAddress})
  
  *DYOR! This is a brand new, unvetted token. High risk, high reward. NFA.*
  `;

  return { shouldPost: true, message: message };
}


export async function fetchLatestPairs(): Promise<any[]> {
    const cacheKey = "dexscreener:latest_pairs_search";
    const cachedData = getCached(cacheKey);
    if (cachedData) {
        console.log("[newPairFinder] Serving latest pairs from cache.");
        return cachedData;
    }
    
    try {
        console.log("[newPairFinder] Fetching latest pairs from DexScreener API...");
        
        const response = await axios.get(`https://api.dexscreener.com/latest/dex/search?q=pair`, {
            params: {
                chain: CHAIN
            }
        });
        
        const pairs = response.data.pairs || [];
        
        pairs.sort((a: any, b: any) => b.pairCreatedAt - a.pairCreatedAt);

        
        const latest15Pairs = pairs.slice(0, 15);

        setCache(cacheKey, latest15Pairs, 60 * 1000); 

        return latest15Pairs;
  } catch (error) {
    console.error("[newPairFinder] Failed to fetch data from DexScreener:", error);
    return [];
  }
}
