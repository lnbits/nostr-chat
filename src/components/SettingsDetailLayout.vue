<template>
  <div class="settings-detail-layout">
    <div class="settings-detail-layout__header">
      <div class="settings-detail-layout__title">{{ title }}</div>
    </div>

    <div class="settings-detail-layout__body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<style scoped>
.settings-detail-layout {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--tg-thread-bg);
}

.settings-detail-layout__header {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid var(--tg-border);
  background: var(--tg-sidebar);
}

.settings-detail-layout__title {
  font-size: 16px;
  font-weight: 600;
}

.settings-detail-layout__body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}
</style>
