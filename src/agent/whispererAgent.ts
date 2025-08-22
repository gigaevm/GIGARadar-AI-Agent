import { TokenInfo } from "../tools/walletScanner/getTokenMeta";

export function createWhispererAgent() {
  return {
    async sendMessage(tokens: TokenInfo[]): Promise<string> {
      if (tokens.length === 0) {
        return "👻 This wallet does not contain any known meme tokens..";
      }

      let message = "🤖 Giga Whisper Analysis\n\n";

      for (const token of tokens) {
        const {
          name,
          symbol,
          priceUsd,
          volume24h,
          liquidity,
          change1h,
          change24h,
          marketCap
        } = token;

        message += `📛 ${name} ($${symbol})\n`;
        message += `💵 Price → $${priceUsd?.toFixed(6)}\n`;
        message += `💧 Liquidity → $${liquidity?.toLocaleString()}\n`;
        message += `📈 Volume (24h) → $${volume24h?.toLocaleString()}\n`;
        message += `🧮 Market Cap → $${marketCap?.toLocaleString()}\n`;
        message += `🔄 Change (1h) → ${change1h?.toFixed(2)}%\n`;
        message += `🔄 Change (24h) → ${change24h?.toFixed(2)}%\n\n`;
      }

      return message;
    }
  };
}
