import type { NewsItem } from '../types/news';
import { newsItems } from '../data/news';

export async function loadNews(): Promise<NewsItem[]> {
  return JSON.parse(JSON.stringify(newsItems)) as NewsItem[];
}
