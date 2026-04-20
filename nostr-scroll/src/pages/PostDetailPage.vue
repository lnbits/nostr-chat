<template>
  <q-page v-if="focusedPost" class="timeline-page">
    <StickyTopBar title="Post" show-back />
    <ThreadView :ancestors="ancestors" :focused-post="focusedPost" :replies="replies" />
    <ReplyComposer @submit="feedStore.replyToPost(focusedPost.id, $event)" />
  </q-page>

  <q-page v-else class="timeline-page">
    <StickyTopBar title="Post" show-back />
    <EmptyState
      title="Post not found"
      subtitle="That post does not exist in the current mock timeline."
    />
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import EmptyState from '../components/feed/EmptyState.vue';
import ReplyComposer from '../components/feed/ReplyComposer.vue';
import StickyTopBar from '../components/layout/StickyTopBar.vue';
import ThreadView from '../components/thread/ThreadView.vue';
import { useFeedStore } from '../stores/feed';

const route = useRoute();
const feedStore = useFeedStore();

const postId = computed(() => route.params.id as string);
const focusedPost = computed(() => feedStore.getPostById(postId.value));
const ancestors = computed(() => feedStore.getThreadAncestors(postId.value));
const replies = computed(() => feedStore.getRepliesForPost(postId.value));

onMounted(() => {
  void feedStore.ensureHydrated();
});
</script>

<style scoped>
.timeline-page,
.profile-page {
  background: transparent;
}
</style>
