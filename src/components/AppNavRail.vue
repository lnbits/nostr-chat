<template>
  <aside class="nav-rail">
    <div class="nav-rail__group">
      <q-btn
        v-for="item in topItems"
        :key="item.key"
        unelevated
        no-caps
        class="nav-rail__btn"
        :class="{ 'nav-rail__btn--active': modelValue === item.key }"
        :label="item.label"
        @click="$emit('update:modelValue', item.key)"
      />
    </div>

    <q-btn
      unelevated
      no-caps
      class="nav-rail__btn"
      :class="{ 'nav-rail__btn--active': modelValue === 'settings' }"
      label="Settings"
      @click="$emit('update:modelValue', 'settings')"
    />
  </aside>
</template>

<script setup lang="ts">
const topItems = [
  { key: 'chats', label: 'Chats' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'favourites', label: 'Favourites' }
] as const;

defineProps<{
  modelValue: 'chats' | 'contacts' | 'favourites' | 'settings';
}>();

defineEmits<{
  (event: 'update:modelValue', value: 'chats' | 'contacts' | 'favourites' | 'settings'): void;
}>();
</script>

<style scoped>
.nav-rail {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 10px 8px;
  background: var(--tg-rail);
}

.nav-rail__group {
  display: grid;
  gap: 8px;
}

.nav-rail__btn {
  border-radius: 12px;
  min-height: 42px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  background: transparent;
  border: 1px solid transparent;
}

.nav-rail__btn--active {
  background: rgba(34, 197, 94, 0.14);
  color: #1f7a48;
  border-color: rgba(34, 197, 94, 0.28);
}

body.body--dark .nav-rail__btn {
  color: #9ca3af;
}

body.body--dark .nav-rail__btn--active {
  color: #73e2a7;
  background: rgba(22, 163, 74, 0.22);
  border-color: rgba(34, 197, 94, 0.35);
}
</style>
