<template>
  <div
    v-if="isVisible"
    class="reconnect-healing-banner"
    :class="{ 'reconnect-healing-banner--expanded': isDetailsVisible }"
    :aria-live="isDetailsVisible ? 'polite' : 'off'"
  >
    <span v-if="isDetailsVisible" class="reconnect-healing-banner__label">
      {{ statusLabel }}
    </span>
    <q-linear-progress
      indeterminate
      color="primary"
      size="2px"
      class="reconnect-healing-banner__progress"
      aria-hidden="true"
    />
    <q-btn
      dense
      flat
      icon="more"
      size="xs"
      :ripple="false"
      class="reconnect-healing-banner__toggle"
      :aria-label="detailsButtonLabel"
      :aria-expanded="isDetailsVisible"
      @click="toggleDetails"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useNostrStore } from 'src/stores/nostrStore';

const nostrStore = useNostrStore();
const RECONNECT_HEALING_DETAILS_STORAGE_KEY = 'nostr-chat:reconnect-healing-details-visible';

const isDetailsVisible = ref(false);
const isVisible = computed(() => nostrStore.isReconnectHealing);
const statusLabel = computed(() => nostrStore.reconnectHealingStatusLabel ?? 'Preparing sync');
const detailsButtonLabel = computed(() =>
  isDetailsVisible.value ? 'Hide sync details' : 'Show sync details'
);

function toggleDetails(): void {
  isDetailsVisible.value = !isDetailsVisible.value;
}

function readStoredDetailsVisibility(): boolean {
  try {
    return window.localStorage.getItem(RECONNECT_HEALING_DETAILS_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeStoredDetailsVisibility(value: boolean): void {
  try {
    window.localStorage.setItem(RECONNECT_HEALING_DETAILS_STORAGE_KEY, String(value));
  } catch {
    // Ignore storage errors; the toggle should still work for the current session.
  }
}

onMounted(() => {
  isDetailsVisible.value = readStoredDetailsVisibility();
});

watch(isDetailsVisible, (value) => {
  writeStoredDetailsVisibility(value);
});
</script>

<style scoped>
.reconnect-healing-banner {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 16px;
  margin: 10px -12px -12px;
  padding: 0 40px 2px 0;
  color: var(--nc-text-primary);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
}

.reconnect-healing-banner--expanded {
  min-height: 30px;
  padding: 3px 44px 5px 12px;
  border-top: 1px solid var(--nc-border);
  background: color-mix(in srgb, var(--q-primary) 7%, var(--nc-panel-header-bg));
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

.q-btn.reconnect-healing-banner__toggle {
  position: absolute;
  right: 4px;
  bottom: -5px;
  z-index: 1;
  min-height: 12px;
  min-width: 20px;
  width: 20px;
  height: 12px;
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.q-btn.reconnect-healing-banner__toggle::before {
  display: none;
  background: transparent;
  box-shadow: none;
}

.q-btn.reconnect-healing-banner__toggle :deep(.q-focus-helper) {
  display: none;
}
</style>
