import { SeiAgentKit } from "../../agent/index";
import { parseAbi, Address, formatUnits } from "viem";
import { getRecommendation } from "../defi_agent/recommendationEngine";
import { getUserRiskProfile } from "../defi_agent/riskProfileManager";
import axios from "axios";


const erc20Abi = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
]);


export async function getErc20Info(
  agent: SeiAgentKit,
  tokenAddress: Address,
  walletAddress: Address
) {
  console.log("  [DEBUG] Memasuki getErc20Info...");

  
  let symbol: string | undefined = undefined;
  let name: string | undefined = undefined;
  let decimals: number | undefined = undefined;
  let balance: bigint | undefined = undefined;

  try {
    
    const results = await Promise.allSettled([
      agent.call?.(erc20Abi, 'balanceOf', [walletAddress], tokenAddress),
      agent.call?.(erc20Abi, 'decimals', [], tokenAddress),
      agent.call?.(erc20Abi, 'symbol', [], tokenAddress),
      agent.call?.(erc20Abi, 'name', [], tokenAddress),
    ]);

    console.log("  [DEBUG] Hasil dari Promise.allSettled:", results);

    
    if (results[0].status === 'fulfilled' && results[0].value != null)
      balance = results[0].value as bigint;

    if (results[1].status === 'fulfilled' && results[1].value != null)
      decimals = results[1].value as number;

    if (results[2].status === 'fulfilled' && results[2].value != null)
      symbol = results[2].value as string;

    if (results[3].status === 'fulfilled' && results[3].value != null)
      name = results[3].value as string;

    console.log(`  [DEBUG] Nilai sebelum format: balance=${balance}, decimals=${decimals}, symbol=${symbol}`);
  } catch (err) {
    console.error("  ❌ Error dalam getErc20Info:", err);
  }

  
  const finalBalance = balance ?? BigInt(0);
  const finalDecimals = decimals ?? 18;
  const finalSymbol = symbol ?? 'UNKNOWN';
  const finalName = name ?? 'UNKNOWN';

  const formattedBalance = formatUnits(finalBalance, finalDecimals);

  
  const riskProfile = getUserRiskProfile(walletAddress.toString()) || 'medium';


  const recommendation = await getRecommendation(finalSymbol, riskProfile);

 
  const tokenAnalysis = `
  📊 *Token Analysis for ${finalSymbol}*:
  - *Name:* ${finalName}
  - *Balance:* ${formattedBalance} ${finalSymbol}
  - *Risk Profile:* ${riskProfile.toUpperCase()}
  
  🔮 *Recommendation:* ${recommendation}
  `;


  return {
    symbol: finalSymbol,
    name: finalName,
    rawBalance: finalBalance,
    formattedBalance: formattedBalance,
    decimals: finalDecimals,
    tokenAnalysis: tokenAnalysis,
  };
}


export async function getDexInfo(tokenAddress: string): Promise<{ priceUsd?: string, priceChange24h?: string }> {
  try {
    const url = `https://api.dexscreener.com/latest/dex/pairs/sei/${tokenAddress.toLowerCase()}`;
    const res = await axios.get(url);
    const pair = res.data?.pair;

    if (pair) {
      return {
        priceUsd: pair.priceUsd,
        priceChange24h: pair.priceChange?.toFixed(2) + "%",
      };
    }
  } catch (err) {
    console.error(`❌ Failed to fetch Dex info for ${tokenAddress}:`, err);
  }

  return {};
}
