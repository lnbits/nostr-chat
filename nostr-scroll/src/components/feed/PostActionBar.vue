<template>
  <div class="post-action-bar" @click.stop>
    <button class="post-action-bar__item post-action-bar__item--reply" type="button" @click="$emit('reply')">
      <q-icon name="chat_bubble_outline" size="18px" />
      <span v-if="formatActionCount(post.stats.replies)">{{ formatActionCount(post.stats.replies) }}</span>
    </button>

    <button
      class="post-action-bar__item post-action-bar__item--repost"
      :class="{ 'post-action-bar__item--reposted': state.reposted }"
      type="button"
      @click="$emit('repost')"
    >
      <q-icon name="repeat" size="18px" />
      <span v-if="formatActionCount(post.stats.reposts)">{{ formatActionCount(post.stats.reposts) }}</span>
    </button>

    <button
      class="post-action-bar__item post-action-bar__item--like"
      :class="{ 'post-action-bar__item--liked': state.liked }"
      type="button"
      @click="$emit('like')"
    >
      <q-icon :name="state.liked ? 'favorite' : 'favorite_border'" size="18px" />
      <span v-if="formatActionCount(post.stats.likes)">{{ formatActionCount(post.stats.likes) }}</span>
    </button>

    <button class="post-action-bar__item post-action-bar__item--views" type="button">
      <q-icon name="bar_chart" size="18px" />
      <span v-if="formatActionCount(post.stats.views)">{{ formatActionCount(post.stats.views) }}</span>
    </button>

    <button
      class="post-action-bar__item post-action-bar__item--bookmark"
      :class="{ 'post-action-bar__item--bookmarked': state.bookmarked }"
      type="button"
      @click="$emit('bookmark')"
    >
      <q-icon :name="state.bookmarked ? 'bookmark' : 'bookmark_border'" size="18px" />
    </button>

    <button class="post-action-bar__item post-action-bar__item--share" type="button" disabled>
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

function formatActionCount(value?: number): string {
  if (!value) {
    return '';
  }

  return formatCompactCount(value);
}
</script>

<style scoped>
.post-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-top: 8px;
  max-width: 520px;
}

.post-action-bar__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--scroll-text-soft);
  background: transparent;
  border: none;
  border-radius: 999px;
  padding: 6px 8px;
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease;
}

.post-action-bar__item:hover:not(:disabled) {
  background: var(--scroll-hover);
}

.post-action-bar__item:disabled {
  cursor: default;
  opacity: 0.7;
}

.post-action-bar__item--reply:hover:not(:disabled),
.post-action-bar__item--views:hover:not(:disabled),
.post-action-bar__item--bookmark:hover:not(:disabled),
.post-action-bar__item--share:hover:not(:disabled) {
  color: var(--scroll-accent);
  background: rgba(29, 155, 240, 0.12);
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

.post-action-bar__item--repost:hover:not(:disabled) {
  color: var(--scroll-success);
  background: rgba(0, 186, 124, 0.12);
}

.post-action-bar__item--like:hover:not(:disabled) {
  color: var(--scroll-danger);
  background: rgba(249, 24, 128, 0.12);
}
</style>
