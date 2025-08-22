import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
export const supabase = createClient(supabaseUrl, supabaseKey);


export async function savePostHistory(tokenId: string, summary: string) {
  const { error } = await supabase
    .from('post_history')
    .insert([{ token_id: tokenId, summary }]);

  if (error) {
    console.error("❌ Supabase insert error:", error.message);
  } else {
    console.log(`💾 Saved post history for ${tokenId}`);
  }
}


export async function wasRecentlyPosted(tokenId: string, cooldownMinutes = 30): Promise<boolean> {
  const since = new Date(Date.now() - cooldownMinutes * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('post_history')
    .select('id')
    .eq('token_id', tokenId)
    .gte('created_at', since)
    .limit(1);

  if (error) {
    console.error("❌ Supabase query error:", error.message);
    return false;
  }

  return data.length > 0;
}


export async function getRecentPosts(limit = 10) {
  const { data, error } = await supabase
    .from('post_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error("❌ Supabase fetch error:", error.message);
    return [];
  }

  return data;
}
