<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { installAppE2EBridge } from 'src/testing/e2eBridge';
import { readDarkModePreference } from 'src/utils/themeStorage';

const $q = useQuasar();
const savedDarkMode = readDarkModePreference();

if (savedDarkMode !== null) {
  $q.dark.set(savedDarkMode);
}

onMounted(() => {
  if (process.env.DEV) {
    installAppE2EBridge();
  }
});
</script>
