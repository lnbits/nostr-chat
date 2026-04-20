<template>
  <div class="post-action-bar" @click.stop>
    <button class="post-action-bar__item" type="button" @click="$emit('reply')">
      <q-icon name="chat_bubble_outline" size="18px" />
      <span>{{ formatCompactCount(post.stats.replies) }}</span>
    </button>

    <button
      class="post-action-bar__item"
      :class="{ 'post-action-bar__item--reposted': state.reposted }"
      type="button"
      @click="$emit('repost')"
    >
      <q-icon name="repeat" size="18px" />
      <span>{{ formatCompactCount(post.stats.reposts) }}</span>
    </button>

    <button
      class="post-action-bar__item"
      :class="{ 'post-action-bar__item--liked': state.liked }"
      type="button"
      @click="$emit('like')"
    >
      <q-icon :name="state.liked ? 'favorite' : 'favorite_border'" size="18px" />
      <span>{{ formatCompactCount(post.stats.likes) }}</span>
    </button>

    <button
      class="post-action-bar__item"
      :class="{ 'post-action-bar__item--bookmarked': state.bookmarked }"
      type="button"
      @click="$emit('bookmark')"
    >
      <q-icon :name="state.bookmarked ? 'bookmark' : 'bookmark_border'" size="18px" />
      <span>{{ formatCompactCount(post.stats.bookmarks) }}</span>
    </button>

    <button class="post-action-bar__item" type="button" disabled>
      <q-icon name="share" size="18px" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { useFormatters } from '../../composables/useFormatters';
import type { NostrNote, ViewerPostState } from '../../types/nostr';

interface Props {
  post: NostrNote;
  state: ViewerPostState;
}

defineEmits<{
  reply: [];
  repost: [];
  like: [];
  bookmark: [];
}>();

defineProps<Props>();

const { formatCompactCount } = useFormatters();
</script>

<style scoped>
.post-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 12px;
}

.post-action-bar__item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--scroll-text-soft);
  background: transparent;
  border: none;
  border-radius: 999px;
  padding: 6px 10px;
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease;
}

.post-action-bar__item:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.05);
}

.post-action-bar__item:disabled {
  cursor: default;
  opacity: 0.7;
}

.post-action-bar__item--liked {
  color: var(--scroll-danger);
}

.post-action-bar__item--reposted {
  color: var(--scroll-success);
}

.post-action-bar__item--bookmarked {
  color: var(--scroll-accent-strong);
}
</style>
