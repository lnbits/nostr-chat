<template>
  <q-avatar
    :color="resolvedSrc ? color : undefined"
    :text-color="resolvedSrc ? textColor : undefined"
    class="cached-avatar"
    :class="{ 'cached-avatar--fallback': !resolvedSrc }"
    :style="avatarStyle"
  >
    <img v-if="resolvedSrc" :src="resolvedSrc" :alt="altText">
    <span v-else class="cached-avatar__fallback">{{ fallbackText }}</span>
  </q-avatar>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useCachedImageUrl } from 'src/composables/useCachedImageUrl';

interface Props {
  src?: string;
  alt?: string;
  fallback: string;
  color?: string;
  textColor?: string;
}

const props = withDefaults(defineProps<Props>(), {
  src: '',
  alt: 'Avatar',
  color: 'primary',
  textColor: 'white'
});

const FALLBACK_AVATAR_COLORS = [
  '#d65563',
  '#d97706',
  '#7c3aed',
  '#2563eb',
  '#0f766e',
  '#4f46e5',
  '#db2777',
  '#059669',
  '#0284c7',
  '#c2410c',
  '#475569',
  '#b45309'
] as const;

function hashString(value: string): number {
  let hash = 0;

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash;
}

const sourceUrl = computed(() => props.src.trim());
const altText = computed(() => props.alt.trim() || 'Avatar');
const fallbackText = computed(() => props.fallback.trim() || 'NA');
const resolvedSrc = useCachedImageUrl(sourceUrl);
const fallbackSeed = computed(() => {
  return props.alt.trim() || props.fallback.trim() || 'NA';
});
const fallbackBackgroundColor = computed(() => {
  const normalizedSeed = fallbackSeed.value.toLowerCase();
  const colorIndex = hashString(normalizedSeed) % FALLBACK_AVATAR_COLORS.length;
  return FALLBACK_AVATAR_COLORS[colorIndex];
});
const avatarStyle = computed(() => {
  if (resolvedSrc.value) {
    return undefined;
  }

  return {
    '--cached-avatar-bg': fallbackBackgroundColor.value
  };
});
</script>

<style scoped>
.cached-avatar--fallback {
  font-weight: 700;
  background: var(--cached-avatar-bg) !important;
  color: #ffffff !important;
}

.cached-avatar__fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  font-size: 1.1em;
  line-height: 1;
  letter-spacing: 0.02em;
}
</style>
