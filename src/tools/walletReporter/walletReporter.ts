import axios from "axios";
import { SeiAgentKit } from "../../agent/index";
import { Address, createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { getErc20Info } from "../sei-erc20/balance";


const tokenList = [
  { symbol: "SEIYAN", address: "0x5f0E07dFeE5832Faa00c63F2D33A0D79150E8598" },
  { symbol: "POPO", address: "0xC18b6a15FB0ceaf5eb18696EeFCb5bc7b9107149" },
  { symbol: "MILLI", address: "0x95597EB8D227a7c4B4f5E807a815C5178eE6dBE1" },
  { symbol: "SHENRN", address: "0x0DD9e6A6AEb91f1e3596F69d5443b6ca2e864896" },
  { symbol: "WSEI", address: "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7" },
  { symbol: "CHIPS", address: "0xBd82f3bfE1dF0c84faEC88a22EbC34C9A86595dc" },
  { symbol: "FROG", address: "0xF9BDbF259eCe5ae17e29BF92EB7ABd7B8b465Db9" },
   { symbol: "SBC", address: "0x3eA30C06F4BA6f696D3ba4b660C39DA96ed8f686" },
   { symbol: "BOBBLE", address: "0xF20903d034B12a7266055FE97cEBdB9199Ec6925" },
   { symbol: "SEIYUN", address: "0xECf7f1EFC9620A911339619C91c9FA0f71e0600E" },
 
];

async function getDexInfo(tokenAddress: Address): Promise<{ price: string; priceChange24h: string }> {
  const url = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`;
  try {
    const res = await axios.get(url);
    const pair = res.data?.pairs?.[0];

    if (!pair) {
      throw new Error("No trading pair found on Dexscreener.");
    }

    return {
      price: parseFloat(pair.priceUsd).toFixed(8),
      priceChange24h: pair.priceChange.h24
        ? `${parseFloat(pair.priceChange.h24).toFixed(2)}%`
        : "N/A",
    };
  } catch (err: any) {
    console.warn(`⚠️ Dexscreener fetch failed for ${tokenAddress}:`, err.message);
    return { price: "0", priceChange24h: "N/A" };
  }
}

export async function reportOnWallet(agent: SeiAgentKit, walletAddress: Address) {
  const seiRpc = process.env.SEI_RPC_URL;
  if (!seiRpc) throw new Error("❌ SEI_RPC_URL missing in .env");

  const client = createPublicClient({ chain: mainnet, transport: http(seiRpc) });

  let assetsText = '';
  let totalValueUsd = 0;
  let assetCount = 0;

  try {
   
    const seiBalanceRaw = await client.getBalance({ address: walletAddress });
    const seiBalance = Number(seiBalanceRaw) / 1e18;

    if (seiBalance > 0) {
      const seiPrice = 0.30; 
      const seiValue = seiBalance * seiPrice;
      totalValueUsd += seiValue;
      assetCount++;
      assetsText += `- ${seiBalance.toFixed(4)} *SEI* ($${seiValue.toFixed(2)})\n`;
    }

    
    for (const token of tokenList) {
      try {
        const info = await getErc20Info(agent, token.address as Address, walletAddress);
        const balanceFloat = parseFloat(info.formattedBalance);
        if (balanceFloat <= 0) continue;

        const dexInfo = await getDexInfo(token.address as Address);
        const price = parseFloat(dexInfo.price);
        const priceChange = dexInfo.priceChange24h;

        const valueUsd = price * balanceFloat;
        totalValueUsd += valueUsd;
        assetCount++;

        assetsText += `- ${balanceFloat.toFixed(4)} *${info.symbol}* ($${valueUsd.toFixed(2)}) | ${priceChange} 24h change\n`;

      } catch (err: any) {
        console.warn(`⚠️ Failed to fetch info for ${token.symbol}:`, err.message);
        continue;
      }
    }

  } catch (err: any) {
    console.error("❌ Wallet scan failed:", err?.response?.data || err.message);
    throw new Error("Failed to scan wallet.");
  }

  let header = `📬 *Wallet Report for:* \`${walletAddress}\`\n\n`;

  if (assetCount > 0) {
    header += `💰 *Holdings:*\n${assetsText}\n`;
  } else {
    header += `💀 This wallet is drier than your ex’s texts. No tokens found.\n\n`;
  }

  header += `🧾 *Estimated Total Value:* $${totalValueUsd.toFixed(2)}`;

  const roastData = {
    wallet: walletAddress,
    totalValueUsd,
    assetCount,
  };

  return { header, roastData };
}
