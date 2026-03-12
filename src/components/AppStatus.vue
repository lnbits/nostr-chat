<template>
  <div class="app-status" :class="{ 'app-status--compact': props.compact }">
    <q-expansion-item
      switch-toggle-side
      expand-separator
      class="app-status__expansion"
    >
      <template #header>
        <q-item-section>
          <div class="app-status__header-main">
            <span class="app-status__summary">{{ statusHeadline }}</span>
            <span class="app-status__badge" :class="`app-status__badge--${overallTone}`">
              {{ overallLabel }}
            </span>
          </div>
        </q-item-section>
      </template>

      <div class="app-status__content">
        <div class="app-status__metrics">
          <div class="app-status__metric">
            <div class="app-status__metric-label">Startup</div>
            <div class="app-status__metric-value">{{ startupSummary }}</div>
          </div>

          <div class="app-status__metric">
            <div class="app-status__metric-label">Relays online</div>
            <div class="app-status__metric-value">{{ connectedRelayCount }} / {{ totalRelayCount }}</div>
          </div>

          <div class="app-status__metric">
            <div class="app-status__metric-label">Read relays</div>
            <div class="app-status__metric-value">{{ readRelayCount }}</div>
          </div>

          <div class="app-status__metric">
            <div class="app-status__metric-label">Write relays</div>
            <div class="app-status__metric-value">{{ writeRelayCount }}</div>
          </div>
        </div>

        <div class="app-status__details">
          <div class="app-status__details-title">Connection details</div>

          <div v-if="offlineRelayPreview.length === 0" class="app-status__details-copy">
            All configured relays are currently connected.
          </div>

          <div v-else class="app-status__relay-list">
            <div
              v-for="relay in offlineRelayPreview"
              :key="relay"
              class="app-status__relay-item"
            >
              <span class="app-status__relay-dot" aria-hidden="true" />
              <span class="app-status__relay-url">{{ relay }}</span>
            </div>

            <div v-if="remainingOfflineRelayCount > 0" class="app-status__details-copy">
              +{{ remainingOfflineRelayCount }} more relay{{ remainingOfflineRelayCount === 1 ? '' : 's' }} offline
            </div>
          </div>
        </div>
      </div>
    </q-expansion-item>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useNostrStore } from 'src/stores/nostrStore';
import { useRelayStore } from 'src/stores/relayStore';

interface Props {
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  compact: false
});

const nostrStore = useNostrStore();
const relayStore = useRelayStore();

relayStore.init();

const relayConnectionSnapshot = computed(() => {
  void nostrStore.relayStatusVersion;

  const relayUrls = relayStore.relays;
  const connected = relayUrls.filter(
    (relayUrl) => nostrStore.getRelayConnectionState(relayUrl) === 'connected'
  );
  const offline = relayUrls.filter(
    (relayUrl) => nostrStore.getRelayConnectionState(relayUrl) !== 'connected'
  );

  return {
    total: relayUrls.length,
    connected,
    offline
  };
});

const totalRelayCount = computed(() => relayConnectionSnapshot.value.total);
const connectedRelayCount = computed(() => relayConnectionSnapshot.value.connected.length);
const readRelayCount = computed(() => relayStore.relayEntries.filter((relay) => relay.read).length);
const writeRelayCount = computed(() => relayStore.relayEntries.filter((relay) => relay.write).length);
const offlineRelayPreview = computed(() => relayConnectionSnapshot.value.offline.slice(0, 4));
const remainingOfflineRelayCount = computed(() => {
  return Math.max(relayConnectionSnapshot.value.offline.length - offlineRelayPreview.value.length, 0);
});

const startupSummary = computed(() => {
  return nostrStore.isRestoringStartupState ? 'Syncing startup data' : 'Startup ready';
});

const relaySummary = computed(() => {
  if (totalRelayCount.value === 0) {
    return 'No relays configured';
  }

  return `${connectedRelayCount.value}/${totalRelayCount.value} relays online`;
});

const statusHeadline = computed(() => {
  if (nostrStore.isRestoringStartupState) {
    return startupSummary.value;
  }

  return relaySummary.value;
});

const overallLabel = computed(() => {
  if (nostrStore.isRestoringStartupState) {
    return 'Syncing';
  }

  if (totalRelayCount.value === 0) {
    return 'Idle';
  }

  if (connectedRelayCount.value === totalRelayCount.value) {
    return 'Healthy';
  }

  if (connectedRelayCount.value > 0) {
    return 'Partial';
  }

  return 'Offline';
});

const overallTone = computed(() => {
  if (nostrStore.isRestoringStartupState) {
    return 'busy';
  }

  if (totalRelayCount.value === 0) {
    return 'idle';
  }

  if (connectedRelayCount.value === totalRelayCount.value) {
    return 'good';
  }

  if (connectedRelayCount.value > 0) {
    return 'warn';
  }

  return 'issue';
});
</script>

<style scoped>
.app-status {
  flex-shrink: 0;
  border-top: 1px solid color-mix(in srgb, var(--tg-border) 90%, #8fa5c1 10%);
  background: var(--tg-panel-header-bg);
  backdrop-filter: blur(10px);
}

.app-status__expansion {
  background: transparent;
}

.app-status__expansion :deep(.q-item) {
  align-items: center;
  min-height: 60px;
  padding: 10px;
}

.app-status__expansion :deep(.q-item__section--side) {
  color: #5d718d;
  padding-left: 12px;
}

.app-status__expansion :deep(.q-expansion-item__content) {
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--tg-sidebar) 82%, transparent),
      color-mix(in srgb, var(--tg-sidebar) 94%, transparent)
    );
}

.app-status__header-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 40px;
}

.app-status__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}

.app-status__badge--good {
  color: #0f5f43;
  background: rgba(28, 166, 121, 0.16);
}

.app-status__badge--warn {
  color: #9a5b00;
  background: rgba(245, 158, 11, 0.16);
}

.app-status__badge--issue {
  color: #b42318;
  background: rgba(239, 68, 68, 0.14);
}

.app-status__badge--busy,
.app-status__badge--idle {
  color: #235e97;
  background: rgba(59, 130, 246, 0.14);
}

.app-status__summary {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
  color: color-mix(in srgb, currentColor 72%, #64748b 28%);
}

.app-status__content {
  padding: 0 13px 13px;
  display: grid;
  gap: 12px;
}

.app-status__metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.app-status__metric {
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--tg-border) 86%, #8ea4c0 14%);
  background: color-mix(in srgb, var(--tg-sidebar) 90%, transparent);
}

.app-status__metric-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.7;
}

.app-status__metric-value {
  margin-top: 4px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
}

.app-status__details {
  padding: 12px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--tg-sidebar) 88%, var(--tg-border) 12%);
}

.app-status__details-title {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 8px;
}

.app-status__details-copy {
  font-size: 12px;
  line-height: 1.5;
  color: color-mix(in srgb, currentColor 78%, #64748b 22%);
}

.app-status__relay-list {
  display: grid;
  gap: 8px;
}

.app-status__relay-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.app-status__relay-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  flex: 0 0 auto;
  background: #ef4444;
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.12);
}

.app-status__relay-url {
  min-width: 0;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

body.body--dark .app-status__expansion :deep(.q-item__section--side) {
  color: #9aacbf;
}

body.body--dark .app-status__badge--good {
  color: #79e0b2;
  background: rgba(18, 122, 91, 0.34);
}

body.body--dark .app-status__badge--warn {
  color: #ffd18a;
  background: rgba(180, 118, 0, 0.26);
}

body.body--dark .app-status__badge--issue {
  color: #ffb2a7;
  background: rgba(185, 28, 28, 0.28);
}

body.body--dark .app-status__badge--busy,
body.body--dark .app-status__badge--idle {
  color: #a8d0ff;
  background: rgba(37, 99, 235, 0.24);
}

@media (max-width: 420px) {
  .app-status__metrics {
    grid-template-columns: 1fr;
  }
}
</style>
