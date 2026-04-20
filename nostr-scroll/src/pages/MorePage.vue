<template>
  <q-page class="timeline-page more-page">
    <StickyTopBar title="More" />

    <div class="more-page__content">
      <div class="more-page__intro text-scroll-muted">
        Quick access to relay and client preferences for the prototype.
      </div>

      <div class="scroll-card more-page__panel">
        <q-expansion-item
          dense
          dense-toggle
          expand-separator
          icon="hub"
          label="My Relays"
          header-class="more-page__section-header"
        >
          <div class="more-page__section-body">
            <div
              v-for="relay in myRelays"
              :key="relay.url"
              class="more-page__row"
            >
              <div class="more-page__row-copy">
                <div class="more-page__row-title">{{ relay.label }}</div>
                <div class="more-page__row-subtitle text-scroll-muted">{{ relay.url }}</div>
              </div>
              <div class="more-page__pill">{{ relay.status }}</div>
            </div>
          </div>
        </q-expansion-item>

        <q-expansion-item
          dense
          dense-toggle
          expand-separator
          icon="sensors"
          label="App Relays"
          header-class="more-page__section-header"
        >
          <div class="more-page__section-body">
            <div
              v-for="relay in appRelays"
              :key="relay.url"
              class="more-page__row"
            >
              <div class="more-page__row-copy">
                <div class="more-page__row-title">{{ relay.label }}</div>
                <div class="more-page__row-subtitle text-scroll-muted">{{ relay.url }}</div>
              </div>
              <div class="more-page__pill more-page__pill--soft">{{ relay.status }}</div>
            </div>
          </div>
        </q-expansion-item>

        <q-expansion-item
          dense
          dense-toggle
          expand-separator
          icon="palette"
          label="Appearance"
          header-class="more-page__section-header"
        >
          <div class="more-page__section-body">
            <div
              v-for="item in appearanceOptions"
              :key="item.label"
              class="more-page__row"
            >
              <div class="more-page__row-copy">
                <div class="more-page__row-title">{{ item.label }}</div>
                <div class="more-page__row-subtitle text-scroll-muted">{{ item.description }}</div>
              </div>
              <div class="more-page__value">{{ item.value }}</div>
            </div>
          </div>
        </q-expansion-item>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import StickyTopBar from '../components/layout/StickyTopBar.vue';

const myRelays = [
  {
    label: 'Primary Write Relay',
    url: 'wss://relay.damus.io',
    status: 'Connected',
  },
  {
    label: 'Profile Backup Relay',
    url: 'wss://nos.lol',
    status: 'Healthy',
  },
  {
    label: 'Timeline Relay',
    url: 'wss://relay.primal.net',
    status: 'Synced',
  },
];

const appRelays = [
  {
    label: 'Discovery Relay',
    url: 'wss://relay.nostr.band',
    status: 'Shared',
  },
  {
    label: 'Fallback Relay',
    url: 'wss://purplepag.es',
    status: 'Standby',
  },
];

const appearanceOptions = [
  {
    label: 'Theme',
    description: 'The current client theme for the prototype shell.',
    value: 'Midnight',
  },
  {
    label: 'Density',
    description: 'Keeps the timeline spacing compact, similar to the current feed layout.',
    value: 'Compact',
  },
  {
    label: 'Media Motion',
    description: 'Controls animated transitions and preview movement inside the app.',
    value: 'Balanced',
  },
];
</script>

<style scoped>
.more-page__content {
  display: grid;
  gap: 18px;
  padding: 16px 0 40px;
}

.more-page__intro {
  padding: 0 16px;
  font-size: 0.95rem;
  line-height: 1.5;
}

.more-page__panel {
  margin: 0 12px;
  overflow: hidden;
}

.more-page__section-body {
  padding: 0 0 8px;
}

.more-page__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.03);
}

.more-page__row:first-child {
  border-top: none;
}

.more-page__row-copy {
  min-width: 0;
  flex: 1;
}

.more-page__row-title {
  font-size: 0.98rem;
  font-weight: 700;
}

.more-page__row-subtitle {
  margin-top: 4px;
  font-size: 0.88rem;
  line-height: 1.45;
  word-break: break-word;
}

.more-page__pill,
.more-page__value {
  flex-shrink: 0;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 0.8rem;
  font-weight: 700;
}

.more-page__pill {
  background: rgba(29, 155, 240, 0.18);
  color: #8ecdf8;
}

.more-page__pill--soft {
  background: rgba(231, 233, 234, 0.08);
  color: var(--scroll-text-muted);
}

.more-page__value {
  background: rgba(255, 255, 255, 0.05);
  color: var(--scroll-text);
}

:deep(.more-page__section-header) {
  min-height: 60px;
  padding: 0 14px;
  color: var(--scroll-text);
}

:deep(.more-page__section-header .q-item__label) {
  font-size: 1rem;
  font-weight: 700;
}

:deep(.more-page__section-header .q-icon) {
  color: var(--scroll-text-muted);
}

@media (max-width: 599px) {
  .more-page__content {
    padding-bottom: 86px;
  }

  .more-page__panel {
    margin: 0;
    border-left: none;
    border-right: none;
    border-radius: 0;
  }
}
</style>
