import { memeTokens } from '../common/memeTokens';
import { SeiAgentKit } from '../agent';
import { saveSnapshot, getLastSnapshot } from './snapshotStore';
import { bot } from '../bot'; 

const seiAgent = new SeiAgentKit(process.env.SEI_PRIVATE_KEY!);

export async function startMarketWatcher() {
  for (const token of memeTokens) {
    const data = await seiAgent.fetchDexscreenerData(token.address);

    const last = await getLastSnapshot(token.symbol);
    await saveSnapshot(token.symbol, data);

   
    if (last) {
      const priceChange = (parseFloat(data.price) - parseFloat(last.price)) / parseFloat(last.price);
      const volumeChange = (data.volume - last.volume) / last.volume;

      const isDumping = priceChange < -0.25 && volumeChange > 0.1;
      if (isDumping) {
        const signal = await seiAgent.getAiResponse('meme_signal_advisor', {
          name: token.symbol,
          symbol: token.symbol,
          priceUsd: data.price,
          volume24h: data.volume,
          liquidity: data.liquidity
        });

        await bot.sendMessage(
          process.env.TELEGRAM_CHAT_ID!,
          `🚨 *${token.symbol} SIGNAL DETECTED*\n\n${signal}`,
          { parse_mode: 'Markdown' }
        );
      }
    }
  }
}
