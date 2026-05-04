<template>
  <div v-if="isVisible" class="reconnect-healing-banner" aria-live="polite">
    <q-icon name="sync" class="reconnect-healing-banner__icon" size="14px" />
    <span class="reconnect-healing-banner__label">{{ statusLabel }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useNostrStore } from 'src/stores/nostrStore';

const nostrStore = useNostrStore();

const isVisible = computed(() => nostrStore.isReconnectHealing);
const statusLabel = computed(() => nostrStore.reconnectHealingStatusLabel ?? 'Preparing sync');
</script>

<style scoped>
.reconnect-healing-banner {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 22px;
  margin: 10px -12px -12px;
  padding: 3px 12px;
  border-top: 1px solid var(--nc-border);
  background: color-mix(in srgb, var(--q-primary) 7%, var(--nc-panel-header-bg));
  color: var(--nc-text-primary);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
}

.reconnect-healing-banner__icon {
  flex: 0 0 auto;
  color: var(--q-primary);
  animation: reconnect-healing-banner-spin 1.2s linear infinite;
}

.reconnect-healing-banner__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes reconnect-healing-banner-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
