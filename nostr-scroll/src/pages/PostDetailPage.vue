<template>
  <q-page v-if="focusedPost" class="timeline-page">
    <StickyTopBar title="Post" show-back />
    <ThreadView :ancestors="ancestors" :focused-post="focusedPost" :replies="replies" />
    <ReplyComposer :submitting="feedStore.publishingPost" @submit="void feedStore.replyToPost(focusedPost.id, $event)" />
  </q-page>

  <q-page v-else class="timeline-page">
    <StickyTopBar title="Post" show-back />
    <EmptyState
      :title="feedStore.isThreadLoading(postId) ? 'Loading post' : 'Post not found'"
      :subtitle="feedStore.getThreadError(postId) || 'That note could not be loaded from the selected relays.'"
    />
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import EmptyState from '../components/feed/EmptyState.vue';
import ReplyComposer from '../components/feed/ReplyComposer.vue';
import StickyTopBar from '../components/layout/StickyTopBar.vue';
import ThreadView from '../components/thread/ThreadView.vue';
import { normalizeEventReference } from '../services/nostrEntityService';
import { useFeedStore } from '../stores/feed';

const route = useRoute();
const feedStore = useFeedStore();

const postId = computed(() => {
  const normalizedReference = normalizeEventReference(route.params.id as string | undefined);
  return normalizedReference?.id ?? '';
});
const focusedPost = computed(() => feedStore.getPostById(postId.value));
const ancestors = computed(() => feedStore.getThreadAncestors(postId.value));
const replies = computed(() => feedStore.getRepliesForPost(postId.value));

onMounted(() => {
  if (!postId.value) {
    return;
  }

  void feedStore.ensureThreadLoaded(postId.value);
});

watch(
  postId,
  (nextPostId) => {
    if (!nextPostId) {
      return;
    }

    void feedStore.ensureThreadLoaded(nextPostId);
  },
  { immediate: true },
);
</script>

<style scoped>
.timeline-page,
.profile-page {
  background: transparent;
}
</style>
