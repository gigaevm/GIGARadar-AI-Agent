import { GoogleGenerativeAI } from "@google/generative-ai";

const keys = process.env.GEMINI_API_KEYS!.split(",").map(k => k.trim());
let currentIndex = 0;

function getModelFromKey(apiKey: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
}

export async function generateWithRotatingKeys(prompt: string): Promise<string> {
  const maxAttempts = keys.length;
  const errorLog: string[] = [];

  for (let i = 0; i < maxAttempts; i++) {
    const apiKey = keys[currentIndex];
    currentIndex = (currentIndex + 1) % keys.length;

    try {
      console.log(`[DEBUG] Trying Gemini Key ${i} (${apiKey.slice(0, 5)}...)`);
      const model = getModelFromKey(apiKey);
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      if (!text) throw new Error("Empty response");
      return text;
    } catch (err: any) {
      const message = err?.message || "";
      errorLog.push(`[Key ${i}] ${message}`);
      const isRetryable = message.includes("429") || message.includes("quota") || message.includes("503");

      if (!isRetryable) {
        throw new Error(`❌ Gemini key index ${i} fatal error: ${message}`);
      }

      await new Promise((r) => setTimeout(r, 300));
    }
  }

  throw new Error(`❌ All Gemini API keys failed or exhausted.\n${errorLog.join("\n")}`);
}
