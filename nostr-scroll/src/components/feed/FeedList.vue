<template>
  <div class="feed-list">
    <template v-if="posts.length">
      <PostCard v-for="post in posts" :key="post.id" :post="post" />

      <div ref="sentinelRef" class="feed-list__sentinel">
        <q-spinner v-if="loadingMore" color="primary" size="28px" />
        <span v-else-if="canLoadMore" class="text-scroll-soft">Loading more posts…</span>
      </div>
    </template>

    <EmptyState v-else :title="emptyTitle" :subtitle="emptySubtitle" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import EmptyState from './EmptyState.vue';
import PostCard from './PostCard.vue';
import type { NostrNote } from '../../types/nostr';

interface Props {
  posts: NostrNote[];
  emptyTitle: string;
  emptySubtitle: string;
  canLoadMore?: boolean;
  loadingMore?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  canLoadMore: false,
  loadingMore: false,
});

const emit = defineEmits<{
  'load-more': [];
}>();

const sentinelRef = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

function observeSentinel(): void {
  if (!sentinelRef.value || observer) {
    return;
  }

  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting && props.canLoadMore && !props.loadingMore) {
        emit('load-more');
      }
    },
    {
      rootMargin: '260px 0px',
    },
  );

  observer.observe(sentinelRef.value);
}

onMounted(observeSentinel);

watch(sentinelRef, () => {
  if (!observer) {
    observeSentinel();
  }
});

onBeforeUnmount(() => {
  observer?.disconnect();
});
</script>

<style scoped>
.feed-list__sentinel {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 74px;
  color: var(--scroll-text-soft);
}
</style>
