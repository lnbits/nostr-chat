<template>
  <div class="settings-detail q-pa-lg">
    <div class="text-subtitle1 q-mb-md">Theme</div>

    <q-card flat bordered class="theme-card">
      <q-card-section class="row items-center justify-between q-gutter-md">
        <div>
          <div class="text-body1">Dark Mode</div>
          <div class="text-caption text-grey-6">
            Switch between light and dark appearance.
          </div>
        </div>

        <q-toggle
          v-model="darkMode"
          color="primary"
          checked-icon="dark_mode"
          unchecked-icon="light_mode"
        />
      </q-card-section>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useQuasar } from 'quasar';

const $q = useQuasar();

const darkMode = computed({
  get: () => $q.dark.isActive,
  set: (value: boolean) => {
    $q.dark.set(value);
  }
});
</script>

<style scoped>
.settings-detail {
  height: 100%;
}

.theme-card {
  max-width: 520px;
  background: color-mix(in srgb, var(--tg-sidebar) 92%, transparent);
}
</style>
