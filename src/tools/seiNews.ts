import Parser from "rss-parser";

const parser = new Parser();

export interface SeiNewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
}

export async function getSeiNews(): Promise<SeiNewsItem[]> {
  try {
    const feed = await parser.parseURL(
      "https://news.google.com/rss/search?q=sei+blockchain&hl=en-ID&gl=ID&ceid=ID:en"
    );

    const newsItems: SeiNewsItem[] = feed.items.map((item) => ({
      id: item.guid || item.link || item.title!,
      title: item.title || "Untitled",
      summary: item.contentSnippet || "",
      url: item.link || "",
      publishedAt: item.pubDate || "",
    }));

    return newsItems;
  } catch (err) {
    console.error("❌ Failed to fetch SEI RSS news:", err);
    return [];
  }
}
