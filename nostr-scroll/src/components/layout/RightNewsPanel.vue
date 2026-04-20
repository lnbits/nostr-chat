<template>
  <div class="right-news-panel">
    <div class="scroll-card news-card">
      <div class="news-card__header">Today's News</div>

      <div v-if="newsItems.length" class="news-list">
        <div v-for="item in newsItems" :key="item.id" class="news-item">
          <div class="news-item__category">{{ item.category }}</div>
          <div class="news-item__headline">{{ item.headline }}</div>
          <div class="news-item__meta text-scroll-muted">
            {{ item.source }} · {{ item.timeLabel }}
          </div>
        </div>
      </div>

      <div v-else class="news-loading text-scroll-muted">Loading headlines…</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { loadMockNews } from '../../services/mockNewsService';
import type { NewsItem } from '../../types/news';

const newsItems = ref<NewsItem[]>([]);

onMounted(async () => {
  newsItems.value = await loadMockNews();
});
</script>

<style scoped>
.right-news-panel {
  position: sticky;
  top: 0;
  padding-top: 28px;
}

.news-card {
  overflow: hidden;
}

.news-card__header {
  padding: 20px 20px 10px;
  font-size: 1.35rem;
  font-weight: 800;
}

.news-list {
  display: flex;
  flex-direction: column;
}

.news-item {
  padding: 16px 20px;
  border-top: 1px solid var(--scroll-border);
  transition: background 160ms ease;
}

.news-item:hover {
  background: rgba(255, 255, 255, 0.03);
}

.news-item__category {
  color: var(--scroll-text-soft);
  font-size: 0.77rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.news-item__headline {
  font-size: 0.98rem;
  line-height: 1.4;
  font-weight: 700;
  margin-bottom: 7px;
}

.news-loading {
  padding: 20px;
}
</style>
