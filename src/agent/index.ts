import * as dotenv from 'dotenv';
dotenv.config({ override: true });

import {
  createPublicClient,
  createWalletClient,
  http,
  PublicClient,
  WalletClient,
  Address,
  PrivateKeyAccount
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sei } from 'viem/chains';
import axios from 'axios';

import { generateWithRotatingKeys } from '../utils/gemini';

const rpcUrl = process.env.SEI_RPC_URL || 'https://rpc.ankr.com/sei';

export class SeiAgentKit {
  public publicClient: PublicClient;
  public walletClient: WalletClient;
  private account: PrivateKeyAccount;

  constructor(privateKey: string) {
    console.log(`[AGENT-INIT] Using RPC: ${rpcUrl}`);

    const normalizedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    this.account = privateKeyToAccount(normalizedKey);

    this.publicClient = createPublicClient({ chain: sei, transport: http(rpcUrl) });
    this.walletClient = createWalletClient({ account: this.account, chain: sei, transport: http(rpcUrl) });
  }

  async call(abi: any, functionName: string, args: any[], contractAddress: Address) {
    try {
      return await this.publicClient.readContract({ address: contractAddress, abi, functionName, args });
    } catch (error) {
      console.error(`[AGENT-CALL-ERROR] Gagal memanggil '${functionName}' di kontrak ${contractAddress}:`, error);
      throw error;
    }
  }

  async sendTransaction(abi: any, functionName: string, args: any[], contractAddress: Address) {
    try {
      const { request } = await this.publicClient.simulateContract({
        account: this.account,
        address: contractAddress,
        abi,
        functionName,
        args
      });
      return await this.walletClient.writeContract(request);
    } catch (error) {
      console.error(`[AGENT-SEND-ERROR] Gagal mengirim transaksi '${functionName}' ke kontrak ${contractAddress}:`, error);
      throw error;
    }
  }

  async fetchDexscreenerData(tokenAddress: Address) {
    const url = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`;
    try {
      const response = await axios.get(url);
      if (!response.data.pairs || response.data.pairs.length === 0) {
        return { price: '0', volume: 0, liquidity: 0 };
      }
      const pair = response.data.pairs[0];
      return {
        price: parseFloat(pair.priceUsd).toFixed(8),
        volume: pair.volume.h24,
        liquidity: pair.liquidity.usd
      };
    } catch (error) {
      return { price: '0', volume: 0, liquidity: 0 };
    }
  }

  async getAiResponse(persona: string, data: any): Promise<string> {
    let prompt: string;

    switch (persona) {
      case 'describe_meme':
        prompt = `
w
        `.trim();
        break;

      case 'roast_wallet':
        prompt = `
You are the real Meme Lord, a degen crypto shitposter AI.
Your task is to write a short, funny roast based on a user's wallet balance.

**USER'S WALLET DATA:**
- Total Value (USD): $${data.totalValueUsd.toFixed(2)}
- Number of different tokens: ${data.assetCount}

**YOUR TASK:**
1. Look at the total value.
2. If value is low (under $1000), roast them for being a pleb.
3. If value is high (over $10,000), roast them for being a whale.
4. Keep it short (2-3 sentences). Be witty.
        `.trim();
        break;

      case 'whale_watcher':
        prompt = `
You are GIGARadar, a sarcastic AI whale watcher bot on the Sei blockchain.

A whale has just moved funds or done something suspicious.

ACTIVITY DATA:
- Tx Hash: ${data.txHash}
- Token: ${data.tokenSymbol} (${data.tokenAddress})
- Action: ${data.actionType}
- Amount: ${data.amountFormatted} ${data.tokenSymbol} ($${data.usdValueFormatted})
- From: ${data.fromLabel || data.from}
- To: ${data.toLabel || data.to}

CONTEXT:
- If it's a huge transfer, raise eyebrows 👀
- If it's a bridge/swap, speculate what they might be planning
- Add sarcasm, meme tone, short & punchy.

YOUR TASK:
Generate 1-2 lines max, make it sharp, funny, and like a degen alerting the squad on Telegram.
        `.trim();
        break;

      case 'degen_wallet_recommendation':
      case 'degen_farming_advisor':
        prompt = data.prompt;
        break;

      case 'meme_market_analyst':
        prompt = `
You are a crypto meme market commentator with zero chill.
Your job is to review the meme token market recap and give your brutally honest, sarcastic, and meme-loaded take.

**DATA PROVIDED (Top Gainers & Losers):**
${JSON.stringify(data, null, 2)}

INSTRUCTIONS:
- Open with a heavy shitpost line.
- Comment on absurd gains/losses.
- Mock weak volume or pump-and-dumps.
- Add memes, emojis, and banter like you're a degen on X (Twitter).
- Keep it short, 2–3 paras max. Just enough for a Telegram shitstorm.
        `.trim();
        break;

      case 'meme_signal_advisor':
        prompt = `
You are a degenerate meme signal bot with the power of AI. You're fed market data and your job is to shout a trading signal: **BUY**, **SELL**, or **AVOID**.

**TOKEN DATA:**
- Name: ${data.name} (${data.symbol})
- Price: $${data.price}
- 24h Volume: $${data.volume}
- Liquidity: $${data.liquidity}

**TASK:**
1. Analyze if this token is in a clear pump, dumping hard, or just dead.
2. If high volume with low liquidity — it smells like a pump. If price is down and volume low — dump it.
3. Give a clear one-word signal: BUY, SELL, or AVOID.
4. Include 1 sentence explanation — make it savage, like a degen.

OUTPUT FORMAT:
SIGNAL: <BUY/SELL/AVOID>
REASON: <your savage sentence>
        `.trim();
        break;

      default:
        return 'Error: Persona AI tidak dikenali.';
    }

    try {
      const output = await generateWithRotatingKeys(prompt);
      return output.trim();
    } catch (error: any) {
      console.error('[GEMINI-SDK-ERROR] Failed generate content:', error.message);
      return 'Try again, we have a lil problem here';
    }
  }
}
