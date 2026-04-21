<template>
  <q-dialog
    :model-value="modelValue"
    transition-show="fade"
    transition-hide="fade"
    @update:model-value="handleDialogToggle"
  >
    <q-card v-if="profile" class="profile-edit-dialog">
      <div class="profile-edit-dialog__header">
        <div class="profile-edit-dialog__header-main">
          <q-btn flat round dense icon="close" class="profile-edit-dialog__close" @click="closeDialog" />
          <div class="profile-edit-dialog__title">Edit profile</div>
        </div>

        <q-btn
          no-caps
          unelevated
          label="Save"
          :loading="profilesStore.savingCurrentUserProfile"
          :disable="!canSave || profilesStore.savingCurrentUserProfile"
          class="scroll-button profile-edit-dialog__save"
          @click="void saveProfile()"
        />
      </div>

      <div class="profile-edit-dialog__body scroll-hidden-scrollbar">
        <div class="profile-edit-dialog__hero">
          <div class="profile-edit-dialog__banner" :style="{ backgroundImage: `url(${draft.banner})` }">
            <div class="profile-edit-dialog__banner-actions">
              <q-btn
                round
                dense
                flat
                icon="photo_camera"
                class="profile-edit-dialog__media-button"
                @click="editBannerUrl"
              />
              <q-btn
                round
                dense
                flat
                icon="auto_awesome"
                class="profile-edit-dialog__media-button"
                @click="editAvatarUrl"
              />
              <q-btn
                round
                dense
                flat
                icon="close"
                class="profile-edit-dialog__media-button"
                @click="resetBanner"
              />
            </div>
          </div>

          <div class="profile-edit-dialog__avatar-wrap">
            <q-avatar size="112px" class="profile-edit-dialog__avatar">
              <img :src="draft.picture" :alt="draft.displayName || profile.displayName" />
            </q-avatar>
            <q-btn
              round
              dense
              flat
              icon="photo_camera"
              class="profile-edit-dialog__avatar-button"
              @click="editAvatarUrl"
            />
          </div>
        </div>

        <div class="profile-edit-dialog__imagine">
          <q-avatar size="54px">
            <img :src="draft.picture" :alt="draft.displayName || profile.displayName" />
          </q-avatar>
          <div class="profile-edit-dialog__imagine-copy">
            <div class="profile-edit-dialog__imagine-title">Update your media</div>
            <div class="text-scroll-muted">Use remote image URLs for your avatar and banner.</div>
          </div>
          <q-btn
            no-caps
            unelevated
            icon="link"
            label="Edit Photo"
            class="scroll-button profile-edit-dialog__imagine-button"
            @click="editAvatarUrl"
          />
        </div>

        <div v-if="saveError" class="profile-edit-dialog__error">
          {{ saveError }}
        </div>

        <label class="profile-edit-dialog__field">
          <span class="profile-edit-dialog__label">Name</span>
          <input v-model="draft.displayName" type="text" maxlength="50" placeholder="Name" />
        </label>

        <label class="profile-edit-dialog__field">
          <span class="profile-edit-dialog__label">Bio</span>
          <textarea v-model="draft.about" rows="4" maxlength="160" placeholder="Bio" />
        </label>

        <label class="profile-edit-dialog__field">
          <span class="profile-edit-dialog__label">Location</span>
          <input v-model="draft.location" type="text" maxlength="30" placeholder="Location" />
        </label>

        <label class="profile-edit-dialog__field">
          <span class="profile-edit-dialog__label">Website</span>
          <input v-model="draft.website" type="url" maxlength="100" placeholder="Website" />
        </label>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useProfilesStore } from '../../stores/profiles';
import type { NostrProfile } from '../../types/nostr';

interface Props {
  modelValue: boolean;
  profile: NostrProfile | null;
}

interface DraftProfileState {
  displayName: string;
  about: string;
  location: string;
  website: string;
  picture: string;
  banner: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const profilesStore = useProfilesStore();
const originalDraft = ref<DraftProfileState | null>(null);
const saveError = ref('');
const draft = reactive<DraftProfileState>({
  displayName: '',
  about: '',
  location: '',
  website: '',
  picture: '',
  banner: '',
});

const canSave = computed(() => draft.displayName.trim().length > 0);

watch(
  () => props.modelValue,
  (isOpen) => {
    if (!isOpen || !props.profile) {
      return;
    }

    setDraftFromProfile(props.profile);
  },
);

watch(
  () => props.profile?.pubkey,
  () => {
    if (!props.modelValue || !props.profile) {
      return;
    }

    setDraftFromProfile(props.profile);
  },
);

function setDraftFromProfile(profile: NostrProfile): void {
  const nextDraft = {
    displayName: profile.displayName,
    about: profile.about,
    location: profile.location ?? '',
    website: profile.website ?? '',
    picture: profile.picture,
    banner: profile.banner,
  };

  Object.assign(draft, nextDraft);
  originalDraft.value = { ...nextDraft };
  saveError.value = '';
}

function handleDialogToggle(isOpen: boolean): void {
  emit('update:modelValue', isOpen);
}

function closeDialog(): void {
  emit('update:modelValue', false);
}

function promptForUrl(label: string, currentValue: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.prompt(label, currentValue) ?? null;
}

function editAvatarUrl(): void {
  const nextUrl = promptForUrl('Enter the image URL for your avatar', draft.picture);
  if (nextUrl === null) {
    return;
  }

  draft.picture = nextUrl.trim() || originalDraft.value?.picture || draft.picture;
}

function editBannerUrl(): void {
  const nextUrl = promptForUrl('Enter the image URL for your banner', draft.banner);
  if (nextUrl === null) {
    return;
  }

  draft.banner = nextUrl.trim() || originalDraft.value?.banner || draft.banner;
}

function resetBanner(): void {
  if (!originalDraft.value) {
    return;
  }

  draft.banner = originalDraft.value.banner;
}

async function saveProfile(): Promise<void> {
  if (!props.profile || !canSave.value) {
    return;
  }

  saveError.value = '';

  try {
    await profilesStore.saveProfile({
      displayName: draft.displayName.trim(),
      about: draft.about.trim(),
      location: draft.location.trim() || undefined,
      website: draft.website.trim() || undefined,
      picture: draft.picture.trim() || undefined,
      banner: draft.banner.trim() || undefined,
    });
    closeDialog();
  } catch (error) {
    saveError.value =
      error instanceof Error ? error.message : 'Failed to save profile changes to relays.';
  }
}
</script>

<style scoped>
.profile-edit-dialog {
  width: min(600px, calc(100vw - 32px));
  max-width: 600px;
  max-height: min(90vh, 820px);
  background: #000000;
  border: 1px solid rgba(83, 100, 113, 0.18);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.62);
}

.profile-edit-dialog__header {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.96);
}

.profile-edit-dialog__header-main {
  display: flex;
  align-items: center;
  gap: 16px;
}

.profile-edit-dialog__close {
  color: var(--scroll-text);
}

.profile-edit-dialog__title {
  font-size: 1.32rem;
  font-weight: 800;
}

.profile-edit-dialog__save {
  min-height: 36px;
  padding: 0 18px;
  background: #eff3f4;
  color: #0f1419;
  font-weight: 800;
}

.profile-edit-dialog__body {
  overflow-y: auto;
  max-height: calc(min(90vh, 820px) - 64px);
}

.profile-edit-dialog__hero {
  position: relative;
  margin-bottom: 88px;
}

.profile-edit-dialog__banner {
  height: 220px;
  background-size: cover;
  background-position: center;
}

.profile-edit-dialog__banner-actions {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: rgba(15, 20, 25, 0.26);
}

.profile-edit-dialog__media-button,
.profile-edit-dialog__avatar-button {
  width: 42px;
  height: 42px;
  background: rgba(15, 20, 25, 0.68);
  color: white;
}

.profile-edit-dialog__avatar-wrap {
  position: absolute;
  bottom: -58px;
  left: 16px;
}

.profile-edit-dialog__avatar {
  border: 4px solid var(--scroll-bg);
  background: var(--scroll-bg);
}

.profile-edit-dialog__avatar-button {
  position: absolute;
  right: 4px;
  bottom: 6px;
}

.profile-edit-dialog__imagine {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 0 16px 16px;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.05);
}

.profile-edit-dialog__imagine-copy {
  min-width: 0;
  flex: 1;
}

.profile-edit-dialog__imagine-title {
  font-weight: 700;
  margin-bottom: 4px;
}

.profile-edit-dialog__imagine-button {
  min-height: 36px;
  padding: 0 16px;
  background: rgba(239, 243, 244, 0.14);
  color: white;
}

.profile-edit-dialog__error {
  margin: 0 16px 16px;
  color: #fda4af;
  font-size: 0.92rem;
}

.profile-edit-dialog__field {
  display: block;
  margin: 0 16px 16px;
  padding: 10px 14px;
  border: 1px solid var(--scroll-border);
  border-radius: 16px;
}

.profile-edit-dialog__label {
  display: block;
  margin-bottom: 6px;
  color: var(--scroll-text-muted);
  font-size: 0.85rem;
}

.profile-edit-dialog__field input,
.profile-edit-dialog__field textarea {
  width: 100%;
  border: none;
  background: transparent;
  color: var(--scroll-text);
  font: inherit;
  resize: vertical;
  outline: none;
}

.profile-edit-dialog__field textarea {
  min-height: 92px;
}
</style>
