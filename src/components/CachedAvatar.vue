<template>
  <q-avatar :color="color" :text-color="textColor">
    <img v-if="resolvedSrc" :src="resolvedSrc" :alt="altText">
    <span v-else>{{ fallbackText }}</span>
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

const sourceUrl = computed(() => props.src.trim());
const altText = computed(() => props.alt.trim() || 'Avatar');
const fallbackText = computed(() => props.fallback.trim() || 'NA');
const resolvedSrc = useCachedImageUrl(sourceUrl);
</script>
