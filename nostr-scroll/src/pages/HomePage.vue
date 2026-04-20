<template>
  <q-page class="timeline-page">
    <StickyTopBar title="Home" />
    <PostComposer @submit="feedStore.createPost($event)" />
    <FeedList
      :posts="feedStore.homeTimeline"
      empty-title="Nothing on the timeline yet"
      empty-subtitle="The mock feed will appear here once the store hydrates."
      :can-load-more="feedStore.hasMoreHome"
      :loading-more="feedStore.loadingMore"
      @load-more="void feedStore.loadMoreHome()"
    />
  </q-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import FeedList from '../components/feed/FeedList.vue';
import PostComposer from '../components/feed/PostComposer.vue';
import StickyTopBar from '../components/layout/StickyTopBar.vue';
import { useFeedStore } from '../stores/feed';

const feedStore = useFeedStore();

onMounted(() => {
  void feedStore.ensureHydrated();
});
</script>
