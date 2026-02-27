<template>
  <section class="app-console" role="region" aria-label="Console panel">
    <header class="app-console__header">
      <div class="app-console__title">Console</div>

      <div class="app-console__actions">
        <q-btn
          flat
          dense
          round
          icon="delete_sweep"
          aria-label="Clear console logs"
          @click="$emit('clear')"
        />
        <q-btn
          flat
          dense
          round
          icon="close"
          aria-label="Close console panel"
          @click="$emit('close')"
        />
      </div>
    </header>

    <div ref="logContainer" class="app-console__body">
      <div v-if="entries.length === 0" class="app-console__empty">No logs yet.</div>

      <article
        v-for="entry in entries"
        :key="entry.id"
        class="app-console__entry"
        :class="`app-console__entry--${entry.level}`"
      >
        <div class="app-console__meta">
          <span class="app-console__time">{{ formatTime(entry.timestamp) }}</span>
          <span class="app-console__level">{{ entry.level }}</span>
        </div>

        <pre class="app-console__message">{{ entry.message }}</pre>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import type { ConsoleEntry } from 'src/stores/consoleStore';

const props = defineProps<{
  entries: ConsoleEntry[];
}>();

defineEmits<{
  (event: 'close'): void;
  (event: 'clear'): void;
}>();

const logContainer = ref<HTMLElement | null>(null);

watch(
  () => props.entries.length,
  async () => {
    await nextTick();
    if (!logContainer.value) {
      return;
    }

    logContainer.value.scrollTop = logContainer.value.scrollHeight;
  }
);

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour12: false });
}
</script>

<style scoped>
.app-console {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 4000;
  height: var(--app-console-height, 260px);
  min-height: 180px;
  border-top: 1px solid var(--tg-border);
  background: color-mix(in srgb, var(--tg-sidebar) 85%, #030712 15%);
  box-shadow: 0 -8px 24px rgba(2, 6, 23, 0.15);
  display: flex;
  flex-direction: column;
}

.app-console__header {
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-bottom: 1px solid var(--tg-border);
}

.app-console__title {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.app-console__actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.app-console__body {
  flex: 1;
  overflow: auto;
  padding: 8px 10px;
  font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.45;
}

.app-console__empty {
  color: #64748b;
}

.app-console__entry {
  padding: 4px 0;
  border-bottom: 1px dashed color-mix(in srgb, var(--tg-border) 75%, transparent);
}

.app-console__entry:last-child {
  border-bottom: 0;
}

.app-console__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.app-console__time {
  color: #64748b;
}

.app-console__level {
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.app-console__entry--log .app-console__level {
  color: #64748b;
}

.app-console__entry--info .app-console__level {
  color: #0ea5e9;
}

.app-console__entry--warn .app-console__level {
  color: #f59e0b;
}

.app-console__entry--error .app-console__level {
  color: #ef4444;
}

.app-console__entry--debug .app-console__level {
  color: #8b5cf6;
}

.app-console__message {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: inherit;
}

body.body--dark .app-console__time {
  color: #94a3b8;
}

body.body--dark .app-console__entry--log .app-console__level {
  color: #cbd5e1;
}
</style>
