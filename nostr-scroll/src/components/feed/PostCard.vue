<template>
  <article
    class="post-card scroll-divider"
    :class="{ 'post-card--highlighted': highlighted }"
    @click="openPost"
  >
    <div v-if="repostedBy" class="post-card__repost text-scroll-soft">
      <q-icon name="repeat" size="16px" />
      <span>{{ repostedBy.displayName }} reposted</span>
    </div>

    <div class="post-card__content">
      <button class="post-card__avatar" type="button" @click.stop="openProfile(displayPost.pubkey)">
        <q-avatar size="42px">
          <img :src="author?.picture" :alt="author?.displayName ?? displayPost.pubkey" />
        </q-avatar>
      </button>

      <div class="post-card__body">
        <div class="post-card__header">
          <button class="post-card__identity" type="button" @click.stop="openProfile(displayPost.pubkey)">
            <span class="post-card__display-name">{{ author?.displayName ?? 'Unknown profile' }}</span>
            <span class="text-scroll-muted">@{{ author?.name ?? 'unknown' }}</span>
          </button>
          <span class="text-scroll-muted">·</span>
          <span class="text-scroll-muted">{{ formatRelativeTime(displayPost.createdAt) }}</span>
        </div>

        <div class="post-card__text">{{ displayPost.content }}</div>

        <PostActionBar
          :post="displayPost"
          :state="postState"
          @reply="openPost"
          @repost="feedStore.toggleRepost(displayPost.id)"
          @like="feedStore.toggleLike(displayPost.id)"
          @bookmark="feedStore.toggleBookmark(displayPost.id)"
        />
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useFormatters } from '../../composables/useFormatters';
import { useFeedStore } from '../../stores/feed';
import { useProfilesStore } from '../../stores/profiles';
import type { NostrNote } from '../../types/nostr';
import PostActionBar from './PostActionBar.vue';

interface Props {
  post: NostrNote;
  highlighted?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  highlighted: false,
});

const router = useRouter();
const feedStore = useFeedStore();
const profilesStore = useProfilesStore();
const { formatRelativeTime } = useFormatters();

const displayPost = computed(() => feedStore.resolveDisplayPost(props.post));
const author = computed(() => profilesStore.getProfileByPubkey(displayPost.value.pubkey));
const repostedBy = computed(() =>
  props.post.kind === 6 ? profilesStore.getProfileByPubkey(props.post.pubkey) : null,
);
const postState = computed(() => feedStore.getViewerPostState(displayPost.value.id));

function openPost(): void {
  void router.push({
    name: 'post-detail',
    params: { id: displayPost.value.id },
  });
}

function openProfile(pubkey: string): void {
  void router.push({
    name: 'profile',
    params: { pubkey },
  });
}
</script>

<style scoped>
.post-card {
  padding: 14px 16px 10px;
  cursor: pointer;
  transition: background 150ms ease;
}

.post-card:hover {
  background: rgba(255, 255, 255, 0.02);
}

.post-card--highlighted {
  background: rgba(29, 155, 240, 0.06);
}

.post-card__repost {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.84rem;
  font-weight: 700;
  margin-bottom: 10px;
  padding-left: 52px;
}

.post-card__content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.post-card__avatar,
.post-card__identity {
  background: transparent;
  border: none;
  color: inherit;
  padding: 0;
  cursor: pointer;
}

.post-card__body {
  flex: 1;
  min-width: 0;
}

.post-card__header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.post-card__identity {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.post-card__display-name {
  font-weight: 800;
}

.post-card__text {
  color: var(--scroll-text);
  white-space: pre-wrap;
  line-height: 1.5;
  font-size: 0.98rem;
}
</style>
