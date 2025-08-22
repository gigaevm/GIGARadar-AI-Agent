export const geminiKeys = [
  process.env.GEMINI_API_KEY_1!,
  process.env.GEMINI_API_KEY_2!,
  process.env.GEMINI_API_KEY_3!,
];

let current = 0;

export function getNextGeminiKey(): string {
  if (geminiKeys.length === 0) {
    throw new Error("No Gemini API keys available in environment variables.");
  }

  const key = geminiKeys[current];
  current = (current + 1) % geminiKeys.length;
  return key;
}
