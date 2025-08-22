# GigaRadar 🚀  
**Next-gen Telegram Bot for Meme Token Analytics & AI-Powered Insights**  

GigaRadar is an open-source, modular Telegram bot that combines **real-time crypto analytics**, **AI-powered shitposting**, and **market signals** specifically for **$SEI ecosystem meme tokens**. Designed for extensibility, GigaRadar is built with a **Cambrian-style modular architecture**, making it easy for developers to contribute and create custom plugins.

---

## ✅ Features  
- **Telegram Bot Integration**  
  Manage everything through Telegram with a sleek user experience.  

- **Modular Architecture**  
  Add or remove features easily with a plugin-style approach.  

- **Meme Market Recap**  
  - Show **Top 3 Gainers & Top 3 Losers** in separate Telegram messages  
  - Data sourced from **Dexscreener API**  
  - Includes **AI commentary** in meme/shitpost style  

- **AI-Powered Persona**  
  - AI generates **shitpost-style market insights**  
  - Powered by **Gemini AI** for humor and context  

- **Customizable Token Whitelist**  
  - Track selected meme tokens in `memeTokens.ts`  
  - Flexible configuration for token monitoring  

---

## 🛠 Tech Stack  
- **Node.js** + **TypeScript**  
- **Telegram Bot API** (via `node-telegram-bot-api`)  
- **Gemini AI API** (for AI commentary & persona responses)  
- **Dexscreener API** (market data feed)  
- **Cambrian Plugin Pattern** for modular development  

---

## 🌍 Why GigaRadar?  
Crypto communities love memes. GigaRadar blends **fun and analytics**:  
✅ Real-time market data  
✅ AI-powered shitposting persona  
✅ Community-driven, extensible design  

**Anyone can fork, customize, and build on top of GigaRadar.**  
Create your own plugins, tweak the persona, or integrate with your favorite DeFi tools.

---

## 📦 Installation  

```bash
# Clone the repository
git clone https://github.com/your-username/GigaRadar.git
cd GigaRadar

# Install dependencies
npm install

# Running the bot
npx tsx src/bot.ts

## Extend with Plugins
GigaRadar is Cambrian-Plugin ready:
Add new features inside the tools/ folder
Examples:
tokenAnalyzer/ for custom token insights
walletReporter/ for wallet-level alerts

We have already written some upcoming features, which can be continued by the community.




