<template>
  <q-page class="timeline-page">
    <StickyTopBar title="Bookmarks" />
    <FeedList
      :posts="feedStore.bookmarksTimeline"
      empty-title="Save posts for later"
      empty-subtitle="Bookmark interesting notes to find them here."
    />
  </q-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import FeedList from '../components/feed/FeedList.vue';
import StickyTopBar from '../components/layout/StickyTopBar.vue';
import { useFeedStore } from '../stores/feed';

const feedStore = useFeedStore();

onMounted(() => {
  void feedStore.ensureHydrated();
});
</script>
