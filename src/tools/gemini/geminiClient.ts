import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEYS = (process.env.GEMINI_API_KEYS || "").split(",").map(k => k.trim()).filter(Boolean);

if (API_KEYS.length === 0) {
  throw new Error("❌ No GEMINI_API_KEYS found in .env");
}

let currentKeyIndex = 0;

function getNextKey() {
  const key = API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  return key;
}

export function getGeminiClient(): GoogleGenerativeAI {
  const key = getNextKey();
  return new GoogleGenerativeAI(key);
}
