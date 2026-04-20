import { useMockDelay } from '../composables/useMockDelay';
import { mockNews } from '../data/mockNews';
import type { NewsItem } from '../types/news';

export async function loadMockNews(): Promise<NewsItem[]> {
  await useMockDelay(30, 90);
  return JSON.parse(JSON.stringify(mockNews)) as NewsItem[];
}
