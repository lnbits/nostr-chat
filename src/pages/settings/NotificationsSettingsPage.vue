<template>
  <SettingsDetailLayout title="Notifications" icon="notifications">
    <q-card flat bordered class="notifications-card">
      <q-card-section class="notifications-card__section">
        <div class="notifications-card__row">
          <div>
            <div class="text-body1">{{ notificationsTitle }}</div>
            <div class="text-caption text-grey-6">
              {{ browserNotificationCaption }}
            </div>
          </div>

          <q-toggle
            :model-value="browserNotificationsEnabled"
            :disable="isPermissionRequestInFlight || !browserNotificationsSupported"
            color="primary"
            checked-icon="notifications_active"
            unchecked-icon="notifications_off"
            @update:model-value="handleBrowserNotificationsToggle"
          />
        </div>
      </q-card-section>
    </q-card>
  </SettingsDetailLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuasar } from 'quasar';
import SettingsDetailLayout from 'src/components/SettingsDetailLayout.vue';
import {
  getBrowserNotificationPermission,
  isBrowserNotificationSupported,
  readBrowserNotificationsPreference,
  requestBrowserNotificationPermission,
  saveBrowserNotificationsPreference
} from 'src/utils/browserNotificationPreference';
import { reportUiError } from 'src/utils/uiErrorHandler';

const $q = useQuasar();

const storedBrowserNotificationsPreference = readBrowserNotificationsPreference();
const browserNotificationsSupported = isBrowserNotificationSupported();
const notificationPermission = ref(getBrowserNotificationPermission());
const browserNotificationsEnabled = ref(
  storedBrowserNotificationsPreference &&
    (notificationPermission.value === 'granted' || notificationPermission.value === 'native')
);
const isPermissionRequestInFlight = ref(false);
const isDesktopRuntime =
  typeof window !== 'undefined' && Boolean(window.desktopRuntime?.isElectron);

if (
  storedBrowserNotificationsPreference &&
  notificationPermission.value !== 'granted' &&
  notificationPermission.value !== 'native'
) {
  saveBrowserNotificationsPreference(false);
}

const notificationsTitle = computed(() =>
  isDesktopRuntime ? 'Show desktop notifications' : 'Show browser notifications'
);

const browserNotificationCaption = computed(() => {
  if (!browserNotificationsSupported) {
    return isDesktopRuntime
      ? 'Desktop notifications are not supported in this app environment.'
      : 'This browser does not support notifications for this app.';
  }

  if (browserNotificationsEnabled.value) {
    return isDesktopRuntime
      ? 'Show a desktop notification when a new message arrives.'
      : 'Show a browser notification when a new message arrives.';
  }

  if (notificationPermission.value === 'denied') {
    return 'Browser notifications are blocked. Allow them in browser settings, then toggle this back on.';
  }

  if (notificationPermission.value === 'native') {
    return 'Off by default. Turning this on will enable desktop notifications for this app.';
  }

  return 'Off by default. Turning this on will ask the browser for notification permission.';
});

async function handleBrowserNotificationsToggle(nextValue: boolean): Promise<void> {
  if (!nextValue) {
    browserNotificationsEnabled.value = false;
    saveBrowserNotificationsPreference(false);
    notificationPermission.value = getBrowserNotificationPermission();
    return;
  }

  if (!browserNotificationsSupported) {
    browserNotificationsEnabled.value = false;
    saveBrowserNotificationsPreference(false);
    $q.notify({
      type: 'warning',
      message: 'Browser notifications are not supported here.',
      position: 'top',
      timeout: 3000
    });
    return;
  }

  if (notificationPermission.value === 'native') {
    browserNotificationsEnabled.value = true;
    saveBrowserNotificationsPreference(true);
    return;
  }

  isPermissionRequestInFlight.value = true;

  try {
    const permission = await requestBrowserNotificationPermission();
    notificationPermission.value = permission;

    if (permission === 'granted') {
      browserNotificationsEnabled.value = true;
      saveBrowserNotificationsPreference(true);
      return;
    }

    browserNotificationsEnabled.value = false;
    saveBrowserNotificationsPreference(false);

    $q.notify({
      type: permission === 'denied' ? 'warning' : 'info',
      message:
        permission === 'denied'
          ? 'Browser notifications were blocked. Allow them in browser settings to enable this.'
          : 'Browser notification permission was not granted.',
      position: 'top',
      timeout: 3200
    });
  } catch (error) {
    browserNotificationsEnabled.value = false;
    saveBrowserNotificationsPreference(false);
    reportUiError(
      'Failed to update browser notification preference',
      error,
      'Failed to update browser notifications.'
    );
  } finally {
    isPermissionRequestInFlight.value = false;
  }
}
</script>

<style scoped>
.notifications-card {
  max-width: 520px;
  background: color-mix(in srgb, var(--tg-sidebar) 92%, transparent);
}

.notifications-card__section {
  display: grid;
  gap: 18px;
}

.notifications-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
</style>
