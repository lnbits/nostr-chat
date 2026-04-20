<template>
  <div class="sticky-top-bar scroll-elevated">
    <q-btn
      v-if="showBack"
      flat
      round
      dense
      icon="arrow_back"
      class="sticky-top-bar__back"
      @click="handleBack"
    />

    <div class="sticky-top-bar__copy">
      <div class="sticky-top-bar__title">{{ title }}</div>
      <div v-if="subtitle" class="sticky-top-bar__subtitle">{{ subtitle }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';
import { useRouter } from 'vue-router';

interface Props {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backFallback?: RouteLocationRaw;
}

const props = withDefaults(defineProps<Props>(), {
  subtitle: '',
  showBack: false,
  backFallback: () => ({ name: 'home' }),
});

const router = useRouter();

function handleBack(): void {
  if (window.history.length > 1) {
    router.back();
    return;
  }

  void router.push(props.backFallback);
}
</script>

<style scoped>
.sticky-top-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 53px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--scroll-border);
}

.sticky-top-bar__back {
  flex-shrink: 0;
  color: var(--scroll-text);
}

.sticky-top-bar__title {
  font-size: 1.24rem;
  font-weight: 800;
  letter-spacing: 0.01em;
}

.sticky-top-bar__subtitle {
  color: var(--scroll-text-muted);
  font-size: 0.82rem;
  margin-top: 2px;
}
</style>
