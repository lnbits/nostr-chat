<template>
  <div class="emoji-picker" :style="pickerStyle">
    <div class="emoji-picker__search">
      <q-input
        v-model="emojiSearch"
        class="tg-input"
        dense
        outlined
        rounded
        clearable
        placeholder="Search emoji"
      >
        <template #prepend>
          <q-icon name="search" />
        </template>
      </q-input>
    </div>

    <div
      ref="emojiScrollRef"
      class="emoji-picker__scroll"
      @scroll="handleEmojiScroll"
    >
      <div
        v-for="group in groupedEmojis"
        :key="group.key"
        class="emoji-picker__group"
        :data-emoji-category="group.key"
      >
        <div class="emoji-picker__group-title">{{ group.label }}</div>
        <div class="emoji-picker__grid">
          <button
            v-for="entry in group.emojis"
            :key="entry.emoji"
            v-close-popup
            type="button"
            class="emoji-picker__item"
            :aria-label="entry.label"
            @mousedown.prevent
            @click="handleSelect(entry.emoji)"
          >
            <span class="emoji-picker__char">{{ entry.emoji }}</span>
            <AppTooltip>{{ entry.label }}</AppTooltip>
          </button>
        </div>
      </div>

      <div v-if="groupedEmojis.length === 0" class="emoji-picker__empty">
        No emoji found.
      </div>
    </div>

    <div
      v-if="groupedEmojis.length > 0"
      class="emoji-picker__tabs"
      role="tablist"
      aria-label="Emoji categories"
    >
      <button
        v-for="group in groupedEmojis"
        :key="group.key"
        type="button"
        class="emoji-picker__tab"
        :class="{ 'emoji-picker__tab--active': activeEmojiCategoryKey === group.key }"
        role="tab"
        :aria-selected="activeEmojiCategoryKey === group.key ? 'true' : 'false'"
        :aria-label="group.label"
        @click="scrollToEmojiCategory(group.key)"
      >
        <q-icon :name="group.icon" size="18px" />
        <AppTooltip anchor="top middle" self="bottom middle" :offset="[0, 8]">
          {{ group.label }}
        </AppTooltip>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import AppTooltip from 'src/components/AppTooltip.vue';
import { filterEmojiEntries, groupEmojiEntries } from 'src/data/topEmojis';
import type { EmojiCategoryKey } from 'src/data/topEmojis';

interface Props {
  width?: string;
  maxHeight?: string;
  columns?: number;
  itemMinHeight?: string;
  itemPadding?: string;
}

const props = withDefaults(defineProps<Props>(), {
  width: '360px',
  maxHeight: '300px',
  columns: 6,
  itemMinHeight: '42px',
  itemPadding: '10px 6px'
});

const emit = defineEmits<{
  (event: 'select', emoji: string): void;
}>();

const emojiSearch = ref('');
const emojiScrollRef = ref<HTMLElement | null>(null);
const activeEmojiCategoryKey = ref<EmojiCategoryKey | null>(null);

const pickerStyle = computed(() => ({
  '--emoji-picker-width': props.width,
  '--emoji-picker-max-height': props.maxHeight,
  '--emoji-picker-columns': `${props.columns}`,
  '--emoji-picker-item-min-height': props.itemMinHeight,
  '--emoji-picker-item-padding': props.itemPadding
}));

const filteredEmojis = computed(() => filterEmojiEntries(emojiSearch.value));
const groupedEmojis = computed(() => groupEmojiEntries(filteredEmojis.value));

watch(
  groupedEmojis,
  (groups) => {
    activeEmojiCategoryKey.value = groups[0]?.key ?? null;

    void nextTick(() => {
      syncActiveEmojiCategory();
    });
  },
  { immediate: true }
);

function getGroupScrollTop(container: HTMLElement, groupElement: HTMLElement): number {
  const containerTop = container.getBoundingClientRect().top;
  const groupTop = groupElement.getBoundingClientRect().top;
  return groupTop - containerTop + container.scrollTop;
}

function syncActiveEmojiCategory(): void {
  const container = emojiScrollRef.value;
  const groups = groupedEmojis.value;

  if (groups.length === 0) {
    activeEmojiCategoryKey.value = null;
    return;
  }

  if (!container) {
    activeEmojiCategoryKey.value = groups[0]?.key ?? null;
    return;
  }

  const groupElements = Array.from(
    container.querySelectorAll<HTMLElement>('[data-emoji-category]')
  );

  if (groupElements.length === 0) {
    activeEmojiCategoryKey.value = groups[0]?.key ?? null;
    return;
  }

  const scrollThreshold = container.scrollTop + 18;
  let nextActiveCategory = groupElements[0]?.dataset.emojiCategory as EmojiCategoryKey | undefined;

  for (const groupElement of groupElements) {
    const groupTop = getGroupScrollTop(container, groupElement);
    if (groupTop <= scrollThreshold) {
      nextActiveCategory = groupElement.dataset.emojiCategory as EmojiCategoryKey | undefined;
      continue;
    }

    break;
  }

  activeEmojiCategoryKey.value = nextActiveCategory ?? groups[0]?.key ?? null;
}

function handleEmojiScroll(): void {
  syncActiveEmojiCategory();
}

function scrollToEmojiCategory(categoryKey: EmojiCategoryKey): void {
  const container = emojiScrollRef.value;

  if (!container) {
    activeEmojiCategoryKey.value = categoryKey;
    return;
  }

  const groupElement = container.querySelector<HTMLElement>(
    `[data-emoji-category="${categoryKey}"]`
  );

  if (!groupElement) {
    return;
  }

  const groupTop = getGroupScrollTop(container, groupElement);
  activeEmojiCategoryKey.value = categoryKey;
  container.scrollTo({
    top: Math.max(groupTop - 4, 0),
    behavior: 'smooth'
  });
}

function handleSelect(emoji: string): void {
  emit('select', emoji);
}

function reset(): void {
  emojiSearch.value = '';

  if (emojiScrollRef.value) {
    emojiScrollRef.value.scrollTop = 0;
  }

  activeEmojiCategoryKey.value = groupedEmojis.value[0]?.key ?? null;

  void nextTick(() => {
    syncActiveEmojiCategory();
  });
}

defineExpose({
  reset
});
</script>

<style scoped>
.emoji-picker {
  width: var(--emoji-picker-width);
  display: flex;
  flex-direction: column;
  padding: 10px;
}

.emoji-picker__search {
  margin-bottom: 10px;
}

.emoji-picker__scroll {
  flex: 1 1 auto;
  min-height: 0;
  max-height: var(--emoji-picker-max-height);
  overflow-y: auto;
  padding-right: 4px;
}

.emoji-picker__group + .emoji-picker__group {
  margin-top: 10px;
}

.emoji-picker__group-title {
  margin-bottom: 8px;
  padding: 0 2px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--q-primary) 58%, currentColor 42%);
}

.emoji-picker__grid {
  display: grid;
  grid-template-columns: repeat(var(--emoji-picker-columns), minmax(0, 1fr));
  gap: 6px;
}

.emoji-picker__item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: var(--emoji-picker-item-min-height);
  padding: var(--emoji-picker-item-padding);
  border: 0;
  border-radius: 12px;
  background: color-mix(in srgb, #ffffff 38%, transparent);
  cursor: pointer;
  transition:
    transform 0.18s ease,
    background-color 0.18s ease;
}

.emoji-picker__item:hover {
  transform: translateY(-1px);
  background: color-mix(in srgb, var(--q-primary) 16%, #ffffff 84%);
}

.emoji-picker__char {
  font-size: 22px;
  line-height: 1;
}

.emoji-picker__tabs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  gap: 4px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid color-mix(in srgb, var(--tg-border) 88%, transparent);
}

.emoji-picker__tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: color-mix(in srgb, currentColor 72%, #60758f 28%);
  cursor: pointer;
  transition:
    color 0.18s ease,
    background-color 0.18s ease,
    transform 0.18s ease;
}

.emoji-picker__tab:hover {
  background: color-mix(in srgb, var(--q-primary) 12%, #ffffff 88%);
  color: inherit;
}

.emoji-picker__tab--active {
  background: color-mix(in srgb, var(--q-primary) 16%, #ffffff 84%);
  color: var(--q-primary);
}

.emoji-picker__tab:active {
  transform: translateY(1px);
}

.emoji-picker__empty {
  padding: 14px 6px 6px;
  font-size: 13px;
  text-align: center;
  opacity: 0.7;
}
</style>
