<template>
  <div v-if="isVisible" class="reconnect-healing-banner" aria-live="polite">
    <span class="reconnect-healing-banner__label">{{ statusLabel }}</span>
    <q-linear-progress
      indeterminate
      color="primary"
      size="2px"
      class="reconnect-healing-banner__progress"
      aria-hidden="true"
    />
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
  position: relative;
  display: flex;
  align-items: center;
  min-height: 22px;
  margin: 10px -12px -12px;
  padding: 3px 12px 5px;
  border-top: 1px solid var(--nc-border);
  background: color-mix(in srgb, var(--q-primary) 7%, var(--nc-panel-header-bg));
  color: var(--nc-text-primary);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
}

.reconnect-healing-banner__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reconnect-healing-banner__progress {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
}
</style>
