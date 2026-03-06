<template>
  <div class="bubble-row" :class="isMine ? 'bubble-row--mine' : 'bubble-row--their'">
    <div class="bubble" :class="isMine ? 'bubble--mine' : 'bubble--their'">
      <p class="bubble__text">{{ message.text }}</p>
      <div class="bubble__meta">
        <span class="bubble__time">{{ formattedTime }}</span>
        <div
          v-if="isMine"
          class="bubble__status"
          :class="{ 'bubble__status--pending': hasPendingRelayStatuses }"
        >
          <span
            v-for="segment in statusSegments"
            :key="segment.key"
            class="bubble__status-segment"
            :class="segment.className"
            :style="{ flex: `${segment.weight} 1 0` }"
          >
            <AppTooltip max-width="360px">
              <div class="bubble__status-tooltip">
                <div class="bubble__status-tooltip-title">{{ segment.title }}</div>
                <div v-if="segment.items.length === 0" class="bubble__status-tooltip-empty">
                  {{ segment.emptyText }}
                </div>
                <div
                  v-for="item in segment.items"
                  :key="`${segment.key}-${item}`"
                  class="bubble__status-tooltip-item"
                >
                  {{ item }}
                </div>
              </div>
            </AppTooltip>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppTooltip from 'src/components/AppTooltip.vue';
import type { Message, MessageRelayStatus } from 'src/types/chat';

const props = defineProps<{
  message: Message;
}>();

const isMine = computed(() => props.message.sender === 'me');

interface StatusSegment {
  key: 'published' | 'pending' | 'failed';
  title: string;
  className: string;
  weight: number;
  items: string[];
  emptyText: string;
}

function isMessageRelayStatus(value: unknown): value is MessageRelayStatus {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const status = value as Partial<MessageRelayStatus>;
  return (
    typeof status.relay_url === 'string' &&
    (status.direction === 'outbound' || status.direction === 'inbound') &&
    (status.status === 'pending' ||
      status.status === 'published' ||
      status.status === 'failed' ||
      status.status === 'received') &&
    (status.scope === 'recipient' || status.scope === 'self' || status.scope === 'subscription')
  );
}

function formatRelayStatusItem(relayStatus: MessageRelayStatus): string {
  const scopeLabel = relayStatus.scope === 'self' ? 'Self' : 'Recipient';
  return `${scopeLabel}: ${relayStatus.relay_url}`;
}

const outboundRelayStatuses = computed(() => {
  const relayStatuses = props.message.meta?.relay_statuses;
  if (!Array.isArray(relayStatuses)) {
    return [] as MessageRelayStatus[];
  }

  return relayStatuses
    .filter(isMessageRelayStatus)
    .filter((relayStatus) => relayStatus.direction === 'outbound')
    .sort((first, second) => {
      const byRelayUrl = first.relay_url.localeCompare(second.relay_url);
      if (byRelayUrl !== 0) {
        return byRelayUrl;
      }

      return first.scope.localeCompare(second.scope);
    });
});

const hasPendingRelayStatuses = computed(() => {
  return outboundRelayStatuses.value.some((relayStatus) => relayStatus.status === 'pending');
});

const statusSegments = computed<StatusSegment[]>(() => {
  const relayStatuses = outboundRelayStatuses.value;
  if (relayStatuses.length === 0) {
    return [
      {
        key: 'pending',
        title: 'In Work',
        className: 'bubble__status-segment--gray',
        weight: 1,
        items: [],
        emptyText: 'No relay status recorded yet.'
      }
    ];
  }

  const published = relayStatuses
    .filter((relayStatus) => relayStatus.status === 'published')
    .map((relayStatus) => formatRelayStatusItem(relayStatus));
  const pending = relayStatuses
    .filter((relayStatus) => relayStatus.status === 'pending')
    .map((relayStatus) => formatRelayStatusItem(relayStatus));
  const failed = relayStatuses
    .filter((relayStatus) => relayStatus.status === 'failed')
    .map((relayStatus) => formatRelayStatusItem(relayStatus));

  return [
    {
      key: 'published',
      title: 'OK',
      className: 'bubble__status-segment--green',
      weight: published.length,
      items: published,
      emptyText: 'No relays confirmed.'
    },
    {
      key: 'pending',
      title: 'In Work',
      className: 'bubble__status-segment--gray',
      weight: pending.length,
      items: pending,
      emptyText: 'No relays pending.'
    },
    {
      key: 'failed',
      title: 'Failed',
      className: 'bubble__status-segment--red',
      weight: failed.length,
      items: failed,
      emptyText: 'No relays failed.'
    }
  ].filter((segment) => segment.weight > 0);
});

const formattedTime = computed(() => {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(props.message.sentAt));
});
</script>

<style scoped>
.bubble-row {
  display: flex;
  margin-bottom: 10px;
}

.bubble-row--mine {
  justify-content: flex-end;
}

.bubble-row--their {
  justify-content: flex-start;
}

.bubble {
  max-width: min(82%, 560px);
  border-radius: 16px;
  padding: 10px 12px;
  box-shadow: 0 3px 10px rgba(15, 23, 42, 0.08);
  animation: bubble-in 180ms ease both;
}

.bubble--mine {
  background: var(--tg-sent);
  border-bottom-right-radius: 6px;
}

.bubble--their {
  background: var(--tg-received);
  border-bottom-left-radius: 6px;
}

.bubble__text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.bubble__meta {
  margin-top: 4px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}

.bubble__time {
  font-size: 11px;
  opacity: 0.65;
}

.bubble__status {
  display: inline-flex;
  align-items: center;
  width: 28px;
  height: 6px;
  border-radius: 999px;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.08);
}

.bubble__status--pending {
  animation: bubble-status-pulse 1.8s ease-in-out infinite;
  transform-origin: center;
}

.bubble__status-segment {
  display: block;
  height: 100%;
  min-width: 4px;
  cursor: pointer;
}

.bubble__status-segment--green {
  flex: 2 1 0;
  background: #16a34a;
}

.bubble__status-segment--gray {
  flex: 1 1 0;
  background: rgba(100, 116, 139, 0.5);
}

.bubble__status-segment--red {
  flex: 1 1 0;
  background: #dc2626;
}

.bubble__status-tooltip {
  text-transform: none;
  letter-spacing: 0;
  min-width: 180px;
}

.bubble__status-tooltip-title {
  font-size: 10px;
  font-weight: 800;
  margin-bottom: 6px;
  opacity: 0.92;
}

.bubble__status-tooltip-empty,
.bubble__status-tooltip-item {
  font-size: 10px;
  line-height: 1.35;
}

.bubble__status-tooltip-item + .bubble__status-tooltip-item {
  margin-top: 3px;
}

@keyframes bubble-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bubble-status-pulse {
  0%,
  100% {
    opacity: 0.72;
    box-shadow:
      inset 0 0 0 1px rgba(15, 23, 42, 0.08),
      0 0 0 0 rgba(100, 116, 139, 0.08);
  }

  50% {
    opacity: 1;
    box-shadow:
      inset 0 0 0 1px rgba(15, 23, 42, 0.08),
      0 0 0 4px rgba(100, 116, 139, 0.18);
  }
}
</style>
