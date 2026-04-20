<template>
  <div class="thread-view">
    <PostCard v-for="post in ancestors" :key="post.id" :post="post" />
    <PostCard :post="focusedPost" highlighted />

    <div class="thread-view__reply-heading scroll-divider">Replies</div>
    <PostCard v-for="reply in replies" :key="reply.id" :post="reply" />
  </div>
</template>

<script setup lang="ts">
import type { NostrNote } from '../../types/nostr';
import PostCard from '../feed/PostCard.vue';

interface Props {
  ancestors: NostrNote[];
  focusedPost: NostrNote;
  replies: NostrNote[];
}

defineProps<Props>();
</script>

<style scoped>
.thread-view__reply-heading {
  padding: 14px 16px;
  font-size: 0.84rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--scroll-text-soft);
}
</style>
