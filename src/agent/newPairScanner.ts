import TelegramBot from 'node-telegram-bot-api';
import { fetchLatestPairs, processNewPair } from '../tools/newPairFinder';


const TARGET_CHANNEL_ID = process.env.TELEGRAM_NEW_PAIR_CHANNEL_ID;

if (!TARGET_CHANNEL_ID) {
    console.warn("⚠️ WARNING: TELEGRAM_NEW_PAIR_CHANNEL_ID is not set in .env. New pair scanner will not post.");
}

export function runNewPairScannerLoop(bot: TelegramBot) {
    console.log("🕵️‍♂️ Autonomous New Pair Scanner Agent is starting...");

    const executeScan = async () => {
        console.log("[NewPairScanner] Running scan cycle...");
        if (!TARGET_CHANNEL_ID) return; 

        try {
            
            const latestPairs = await fetchLatestPairs();

            if (!latestPairs || latestPairs.length === 0) {
                console.log("[NewPairScanner] No new pairs found in this cycle.");
                return;
            }

            
            for (const pair of latestPairs) {
                
                const result = await processNewPair(pair);

                
                if (result.shouldPost) {
                    await bot.sendMessage(TARGET_CHANNEL_ID, result.message, {
                        parse_mode: 'Markdown',
                        disable_web_page_preview: false
                    });
                    console.log(`[NewPairScanner] ✅ Posted new alpha to Telegram for $${pair.baseToken.symbol}`);
                    
                    await new Promise(resolve => setTimeout(resolve, 2000)); 
                }
            }

        } catch (error) {
            console.error("[NewPairScanner] ❌ An error occurred during the scan cycle:", error);
        }
    };

    
    setInterval(executeScan, 2 * 60 * 1000); 

    
    setTimeout(executeScan, 10 * 1000);
}
