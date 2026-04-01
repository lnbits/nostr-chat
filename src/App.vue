<template>
  <router-view />
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import { readDarkModePreference } from 'src/utils/themeStorage';

const $q = useQuasar();
const savedDarkMode = readDarkModePreference();

if (savedDarkMode !== null) {
  $q.dark.set(savedDarkMode);
}
</script>
