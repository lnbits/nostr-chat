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
          <div class="app-status__details-title">Current startup step</div>

          <div v-if="displayedStartupStep" class="app-status__startup-panel">
            <q-linear-progress
              v-if="displayedStartupStep.showProgress"
              indeterminate
              rounded
              color="primary"
              track-color="transparent"
              class="app-status__progress"
            />

            <div class="app-status__startup-row">
              <q-icon
                :name="startupStatusIcon(displayedStartupStep.status)"
                :class="startupStatusClass(displayedStartupStep.status)"
                size="18px"
              />
              <div class="app-status__startup-copy">
                <div class="app-status__startup-label">
                  {{ displayedStartupStep.order }}. {{ displayedStartupStep.label }}
                </div>
                <div class="app-status__startup-meta">
                  {{ startupStepMeta(displayedStartupStep) }}
                </div>
              </div>
            </div>
          </div>

          <div v-else class="app-status__details-copy">
            Startup activity will appear here as relay data is restored.
          </div>
        </div>

        <div class="app-status__details">
          <div class="app-status__details-title">Startup history</div>

          <div v-if="startupHistory.length === 0" class="app-status__details-copy">
            No startup steps recorded yet.
          </div>

          <div v-else class="app-status__history-list">
            <div
              v-for="step in startupHistory"
              :key="step.id"
              class="app-status__history-item"
            >
              <q-icon
                :name="startupStatusIcon(step.status)"
                :class="startupStatusClass(step.status)"
                size="16px"
              />
              <div class="app-status__history-copy">
                <div class="app-status__history-label">{{ step.order }}. {{ step.label }}</div>
                <div class="app-status__history-meta">{{ startupStepMeta(step) }}</div>
              </div>
              <div class="app-status__history-duration">{{ startupStepDuration(step) }}</div>
            </div>
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
import type { StartupStepSnapshot, StartupStepStatus } from 'src/stores/nostrStore';
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

const startupSteps = computed(() => nostrStore.startupSteps);
const totalRelayCount = computed(() => relayConnectionSnapshot.value.total);
const connectedRelayCount = computed(() => relayConnectionSnapshot.value.connected.length);
const readRelayCount = computed(() => relayStore.relayEntries.filter((relay) => relay.read).length);
const writeRelayCount = computed(() => relayStore.relayEntries.filter((relay) => relay.write).length);
const offlineRelayPreview = computed(() => relayConnectionSnapshot.value.offline.slice(0, 4));
const remainingOfflineRelayCount = computed(() => {
  return Math.max(relayConnectionSnapshot.value.offline.length - offlineRelayPreview.value.length, 0);
});

const startedStartupStepCount = computed(() => {
  return startupSteps.value.filter((step) => step.status !== 'pending').length;
});

const completedStartupStepCount = computed(() => {
  return startupSteps.value.filter((step) => step.status === 'success').length;
});

const failedStartupStepCount = computed(() => {
  return startupSteps.value.filter((step) => step.status === 'error').length;
});

const inProgressStartupStepCount = computed(() => {
  return startupSteps.value.filter((step) => step.status === 'in_progress').length;
});

const pendingStartupStepCount = computed(() => {
  return startupSteps.value.filter((step) => step.status === 'pending').length;
});

const hasStartupHistory = computed(() => startedStartupStepCount.value > 0);

const isStartupRunning = computed(() => {
  return inProgressStartupStepCount.value > 0 || (hasStartupHistory.value && pendingStartupStepCount.value > 0);
});

const displayedStartupStep = computed(() => {
  const displayStepId = nostrStore.startupDisplay.stepId;
  if (!displayStepId) {
    return null;
  }

  const step = startupSteps.value.find((entry) => entry.id === displayStepId);
  if (!step) {
    return null;
  }

  return {
    ...step,
    status: nostrStore.startupDisplay.status ?? step.status,
    showProgress: nostrStore.startupDisplay.showProgress
  };
});

const startupHistory = computed(() => {
  const inProgress = startupSteps.value
    .filter((step) => step.status === 'in_progress')
    .sort((first, second) => (second.startedAt ?? 0) - (first.startedAt ?? 0));
  const finished = startupSteps.value
    .filter((step) => step.status === 'success' || step.status === 'error')
    .sort((first, second) => (second.completedAt ?? 0) - (first.completedAt ?? 0));
  const pending = startupSteps.value
    .filter((step) => step.status === 'pending')
    .sort((first, second) => first.order - second.order);

  return [...inProgress, ...finished, ...pending];
});

const startupSummary = computed(() => {
  if (!hasStartupHistory.value) {
    return 'Waiting to start';
  }

  const totalStepCount = startupSteps.value.length;
  const doneCount = completedStartupStepCount.value + failedStartupStepCount.value;
  if (failedStartupStepCount.value > 0) {
    return `${doneCount} / ${totalStepCount} done, ${failedStartupStepCount.value} failed`;
  }

  if (isStartupRunning.value) {
    return `${doneCount} / ${totalStepCount} done`;
  }

  return `${completedStartupStepCount.value} / ${totalStepCount} complete`;
});

const relaySummary = computed(() => {
  if (totalRelayCount.value === 0) {
    return 'No relays configured';
  }

  return `${connectedRelayCount.value}/${totalRelayCount.value} relays online`;
});

const statusHeadline = computed(() => {
  if (isStartupRunning.value && displayedStartupStep.value) {
    return `${displayedStartupStep.value.order}. ${displayedStartupStep.value.label}`;
  }

  if (hasStartupHistory.value) {
    return startupSummary.value;
  }

  return relaySummary.value;
});

const overallLabel = computed(() => {
  if (isStartupRunning.value) {
    return 'Syncing';
  }

  if (failedStartupStepCount.value > 0) {
    return 'Issues';
  }

  if (hasStartupHistory.value) {
    return 'Ready';
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
  if (isStartupRunning.value) {
    return 'busy';
  }

  if (failedStartupStepCount.value > 0) {
    return 'issue';
  }

  if (hasStartupHistory.value) {
    return 'good';
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

function startupStatusIcon(status: StartupStepStatus | null): string {
  if (status === 'success') {
    return 'check_circle';
  }

  if (status === 'error') {
    return 'cancel';
  }

  if (status === 'in_progress') {
    return 'radio_button_unchecked';
  }

  return 'more_horiz';
}

function startupStatusClass(status: StartupStepStatus | null): string {
  if (status === 'success') {
    return 'app-status__status-icon app-status__status-icon--success';
  }

  if (status === 'error') {
    return 'app-status__status-icon app-status__status-icon--error';
  }

  if (status === 'in_progress') {
    return 'app-status__status-icon app-status__status-icon--progress';
  }

  return 'app-status__status-icon app-status__status-icon--pending';
}

function startupStepMeta(
  step: StartupStepSnapshot | (StartupStepSnapshot & { showProgress?: boolean })
): string {
  if (step.status === 'error') {
    return step.errorMessage?.trim() || 'Failed';
  }

  if (step.status === 'success') {
    return `Completed in ${startupStepDuration(step)}`;
  }

  if (step.status === 'in_progress') {
    return step.showProgress === true ? 'Fetching from relays...' : 'In progress';
  }

  return 'Pending';
}

function startupStepDuration(step: StartupStepSnapshot): string {
  if (typeof step.durationMs !== 'number' || !Number.isFinite(step.durationMs)) {
    return step.status === 'in_progress' ? 'Running' : 'Pending';
  }

  if (step.durationMs < 1000) {
    return `${Math.max(1, Math.round(step.durationMs))} ms`;
  }

  return `${(step.durationMs / 1000).toFixed(step.durationMs >= 10000 ? 0 : 1)} s`;
}
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

.app-status__startup-panel {
  display: grid;
  gap: 10px;
}

.app-status__progress {
  height: 6px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(59, 130, 246, 0.12);
}

.app-status__startup-row,
.app-status__history-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: start;
}

.app-status__startup-copy,
.app-status__history-copy {
  min-width: 0;
}

.app-status__startup-label,
.app-status__history-label {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
}

.app-status__startup-meta,
.app-status__history-meta,
.app-status__history-duration {
  font-size: 12px;
  line-height: 1.45;
  color: color-mix(in srgb, currentColor 76%, #64748b 24%);
}

.app-status__history-list {
  display: grid;
  gap: 10px;
}

.app-status__history-item + .app-status__history-item {
  padding-top: 10px;
  border-top: 1px solid color-mix(in srgb, var(--tg-border) 84%, transparent);
}

.app-status__history-duration {
  white-space: nowrap;
}

.app-status__status-icon {
  margin-top: 1px;
}

.app-status__status-icon--success {
  color: #16a34a;
}

.app-status__status-icon--error {
  color: #dc2626;
}

.app-status__status-icon--progress,
.app-status__status-icon--pending {
  color: #74839b;
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

body.body--dark .app-status__status-icon--success {
  color: #7ee2a8;
}

body.body--dark .app-status__status-icon--error {
  color: #ff9b90;
}

body.body--dark .app-status__status-icon--progress,
body.body--dark .app-status__status-icon--pending {
  color: #9aacbf;
}

@media (max-width: 420px) {
  .app-status__metrics {
    grid-template-columns: 1fr;
  }

  .app-status__startup-row,
  .app-status__history-item {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .app-status__history-duration {
    grid-column: 2;
  }
}
</style>
