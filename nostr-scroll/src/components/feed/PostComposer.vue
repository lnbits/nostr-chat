<template>
  <div class="post-composer scroll-divider">
    <q-avatar size="46px" class="post-composer__avatar">
      <img :src="currentProfile?.picture" :alt="currentProfile?.displayName ?? 'Profile'" />
    </q-avatar>

    <div class="post-composer__body">
      <q-input
        v-model="draft"
        autogrow
        borderless
        class="post-composer__input"
        :placeholder="placeholder"
        maxlength="280"
      />

      <div class="post-composer__actions">
        <span class="text-scroll-soft">{{ draft.length }}/280</span>

        <q-btn
          no-caps
          unelevated
          class="scroll-button post-composer__submit"
          color="primary"
          :label="buttonLabel"
          :disable="!canSubmit"
          @click="submit"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { useProfilesStore } from '../../stores/profiles';

interface Props {
  placeholder?: string;
  buttonLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: "What's happening?",
  buttonLabel: 'Post',
});

const emit = defineEmits<{
  submit: [content: string];
}>();

const draft = ref('');
const authStore = useAuthStore();
const profilesStore = useProfilesStore();

const currentProfile = computed(() =>
  profilesStore.getProfileByPubkey(authStore.currentPubkey),
);
const canSubmit = computed(() => draft.value.trim().length > 0);

function submit(): void {
  const content = draft.value.trim();
  if (!content) {
    return;
  }

  emit('submit', content);
  draft.value = '';
}
</script>

<style scoped>
.post-composer {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 18px 16px;
}

.post-composer__body {
  flex: 1;
  min-width: 0;
}

.post-composer__input :deep(textarea) {
  min-height: 74px;
  color: var(--scroll-text);
  font-size: 1.18rem;
  line-height: 1.45;
}

.post-composer__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
}

.post-composer__submit {
  min-width: 88px;
}
</style>
