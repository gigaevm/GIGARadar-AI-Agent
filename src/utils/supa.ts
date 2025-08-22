import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const supabase = createClient(supabaseUrl, supabaseKey);


export async function savePostHistory(
  tokenSymbol: string,
  summary: string,
  aiComment: string,
  pairAddress: string,
  reason: string,
  source = "autoRadar"
) {
  const { error } = await supabase.from("post_history").insert([
    {
      token_symbol: tokenSymbol,
      summary,
      ai_comment: aiComment,
      posted_at: new Date().toISOString(),
      pair_address: pairAddress,
      source,
      reason,
    },
  ]);

  if (error) {
    console.error("❌ Supabase insert error (post_history):", error.message);
  } else {
    console.log(`💾 Post history saved for $${tokenSymbol}`);
  }
}


export async function wasRecentlyPosted(tokenSymbol: string, cooldownMinutes = 30): Promise<boolean> {
  const since = new Date(Date.now() - cooldownMinutes * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("post_history")
    .select("id")
    .eq("token_symbol", tokenSymbol)
    .gte("posted_at", since)
    .limit(1);

  if (error) {
    console.error("❌ Supabase query error (wasRecentlyPosted):", error.message);
    return false;
  }

  return (data?.length ?? 0) > 0;
}


export async function saveTokenInsight(
  tokenSymbol: string,
  data: {
    volume: number;
    liquidity: number;
    change_24h: number;
    ai_summary: string;
  }
) {
  const { error } = await supabase.from("token_insights").upsert([
    {
      token_id: tokenSymbol,
      date: new Date().toISOString().split("T")[0],
      ...data,
    },
  ]);

  if (error) {
    console.error("❌ Supabase insert error (token_insights):", error.message);
  } else {
    console.log(`📊 Token insight saved for $${tokenSymbol}`);
  }
}


export async function saveAgentMoodLog(entry: {
  token_symbol: string;
  token_address?: string;
  pair_address?: string;
  mood: string;
  confidence: number;
  selected_by_ai: boolean;
  reason?: string;
}) {
  const { error } = await supabase.from("agent_mood_log").insert([
    {
      ...entry,
      created_at: new Date().toISOString(),
    },
  ]);

  if (error) {
    console.error("❌ Failed to save agent_mood_log:", error.message);
  } else {
    console.log(`🧠 Mood log saved → ${entry.token_symbol} [${entry.mood}]`);
  }
}


export async function savePostedNews(newsId: string, title: string) {
  const { error } = await supabase.from("news_post_history").insert([
    {
      news_id: newsId,
      title,
      posted_at: new Date().toISOString(),
    },
  ]);

  if (error) {
    console.error("❌ Failed to save news_post_history:", error.message);
  } else {
    console.log(`📰 News saved: ${title}`);
  }
}


export async function wasNewsAlreadyPosted(newsId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("news_post_history")
    .select("id")
    .eq("news_id", newsId)
    .limit(1);

  if (error) {
    console.error("❌ Supabase error (wasNewsAlreadyPosted):", error.message);
    return false;
  }

  return (data?.length ?? 0) > 0;
}


export async function getTodayPostedNewsCount(): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("news_post_history")
    .select("id", { count: "exact" })
    .gte("posted_at", `${today}T00:00:00Z`);

  if (error) {
    console.error("❌ Supabase error (getTodayPostedNewsCount):", error.message);
    return 0;
  }

  return data?.length || 0;
}
