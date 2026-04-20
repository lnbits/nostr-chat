<template>
  <q-tabs
    :model-value="modelValue"
    no-caps
    inline-label
    outside-arrows
    mobile-arrows
    class="profile-tabs scroll-divider scroll-hidden-scrollbar"
    active-color="white"
    indicator-color="primary"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <q-tab name="posts" label="Posts" />
    <q-tab name="replies" label="Replies" />
    <q-tab name="likes" label="Likes" />
    <q-tab name="reposts" label="Reposts" />
  </q-tabs>
</template>

<script setup lang="ts">
import type { ProfileTab } from '../../types/nostr';

interface Props {
  modelValue: ProfileTab;
}

defineProps<Props>();

defineEmits<{
  'update:modelValue': [tab: ProfileTab];
}>();
</script>

<style scoped>
.profile-tabs {
  min-height: 54px;
}

.profile-tabs :deep(.q-tab) {
  color: var(--scroll-text-muted);
  font-weight: 700;
}
</style>
