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
          :disable="!canSave"
          class="scroll-button profile-edit-dialog__save"
          @click="saveProfile"
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
                @click="cycleBanner"
              />
              <q-btn
                round
                dense
                flat
                icon="auto_awesome"
                class="profile-edit-dialog__media-button"
                @click="applyImagineRefresh"
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
              @click="cycleAvatar"
            />
          </div>
        </div>

        <div class="profile-edit-dialog__imagine">
          <q-avatar size="54px">
            <img :src="draft.picture" :alt="draft.displayName || profile.displayName" />
          </q-avatar>
          <div class="profile-edit-dialog__imagine-copy">
            <div class="profile-edit-dialog__imagine-title">Edit your photo with Imagine</div>
            <div class="text-scroll-muted">Customize yourself in seconds</div>
          </div>
          <q-btn
            no-caps
            unelevated
            icon="auto_awesome"
            label="Edit Photo"
            class="scroll-button profile-edit-dialog__imagine-button"
            @click="applyImagineRefresh"
          />
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
import { createAvatarDataUri, createBannerDataUri } from '../../data/mockMedia';
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

const avatarPalettes: [string, string][] = [
  ['#1d9bf0', '#075985'],
  ['#f97316', '#c2410c'],
  ['#10b981', '#047857'],
  ['#e879f9', '#9333ea'],
  ['#f43f5e', '#9f1239'],
];
const bannerPalettes: [string, string, string][] = [
  ['#0b1220', '#162234', '#1d9bf0'],
  ['#1f1128', '#2a1436', '#e879f9'],
  ['#091914', '#14372c', '#10b981'],
  ['#201108', '#3a1c0d', '#f97316'],
  ['#12121f', '#1c2440', '#60a5fa'],
];

const avatarPaletteIndex = ref(0);
const bannerPaletteIndex = ref(0);
const originalDraft = ref<DraftProfileState | null>(null);
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
  avatarPaletteIndex.value = 0;
  bannerPaletteIndex.value = 0;
}

function handleDialogToggle(isOpen: boolean): void {
  emit('update:modelValue', isOpen);
}

function closeDialog(): void {
  emit('update:modelValue', false);
}

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return 'NS';
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function cycleAvatar(): void {
  avatarPaletteIndex.value = (avatarPaletteIndex.value + 1) % avatarPalettes.length;
  const [startColor, endColor] = avatarPalettes[avatarPaletteIndex.value];

  draft.picture = createAvatarDataUri(
    getInitials(draft.displayName || props.profile?.displayName || 'Nostr Scroll'),
    startColor,
    endColor,
  );
}

function cycleBanner(): void {
  bannerPaletteIndex.value = (bannerPaletteIndex.value + 1) % bannerPalettes.length;
  const [startColor, endColor, accentColor] = bannerPalettes[bannerPaletteIndex.value];

  draft.banner = createBannerDataUri(
    draft.displayName.trim() || props.profile?.displayName || 'Nostr Scroll',
    startColor,
    endColor,
    accentColor,
  );
}

function resetBanner(): void {
  if (!originalDraft.value) {
    return;
  }

  draft.banner = originalDraft.value.banner;
}

function applyImagineRefresh(): void {
  cycleAvatar();
  cycleBanner();
}

function saveProfile(): void {
  if (!props.profile || !canSave.value) {
    return;
  }

  profilesStore.updateProfile(props.profile.pubkey, {
    displayName: draft.displayName.trim(),
    about: draft.about.trim(),
    location: draft.location.trim() || undefined,
    website: draft.website.trim() || undefined,
    picture: draft.picture,
    banner: draft.banner,
  });
  closeDialog();
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
  min-height: 34px;
  padding: 0 18px;
  background: #eff3f4;
  color: #0f1419;
  font-weight: 800;
}

.profile-edit-dialog__save.q-btn--disabled {
  opacity: 0.38 !important;
}

.profile-edit-dialog__body {
  max-height: calc(min(90vh, 820px) - 60px);
  overflow-y: auto;
  padding-bottom: 18px;
}

.profile-edit-dialog__hero {
  position: relative;
}

.profile-edit-dialog__banner {
  position: relative;
  height: 210px;
  background-size: cover;
  background-position: center;
}

.profile-edit-dialog__banner::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.12);
}

.profile-edit-dialog__banner-actions {
  position: absolute;
  left: 50%;
  bottom: 18px;
  z-index: 1;
  display: flex;
  gap: 12px;
  transform: translateX(-50%);
}

.profile-edit-dialog__media-button,
.profile-edit-dialog__avatar-button {
  background: rgba(15, 20, 25, 0.74);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(8px);
}

.profile-edit-dialog__avatar-wrap {
  position: absolute;
  left: 16px;
  bottom: -58px;
  z-index: 1;
}

.profile-edit-dialog__avatar {
  border: 4px solid #000000;
  background: #000000;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.06);
}

.profile-edit-dialog__avatar-button {
  position: absolute;
  right: 6px;
  bottom: 6px;
}

.profile-edit-dialog__imagine {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 74px 16px 12px;
  padding: 12px 14px;
  border: 1px solid rgba(83, 100, 113, 0.22);
  border-radius: 14px;
  background: #16181c;
}

.profile-edit-dialog__imagine-copy {
  flex: 1;
  min-width: 0;
}

.profile-edit-dialog__imagine-title {
  font-weight: 800;
  margin-bottom: 2px;
}

.profile-edit-dialog__imagine-button {
  flex-shrink: 0;
  min-height: 34px;
  padding: 0 14px;
  background: #2f3336;
  color: var(--scroll-text);
}

.profile-edit-dialog__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0 16px 12px;
  padding: 10px 14px 12px;
  border: 1px solid var(--scroll-border);
  border-radius: 6px;
  background: #000000;
}

.profile-edit-dialog__label {
  color: var(--scroll-text-muted);
  font-size: 0.82rem;
}

.profile-edit-dialog__field input,
.profile-edit-dialog__field textarea {
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--scroll-text);
  font: inherit;
  outline: none;
  resize: none;
}

.profile-edit-dialog__field textarea {
  min-height: 76px;
  line-height: 1.45;
}

.profile-edit-dialog__field:focus-within {
  border-color: var(--scroll-accent);
  box-shadow: inset 0 0 0 1px var(--scroll-accent);
}

@media (max-width: 599px) {
  .profile-edit-dialog {
    width: 100vw;
    max-width: 100vw;
    max-height: 100vh;
    min-height: 100vh;
    border: none;
    border-radius: 0;
  }

  .profile-edit-dialog__body {
    max-height: calc(100vh - 60px);
  }

  .profile-edit-dialog__banner {
    height: 180px;
  }
}
</style>
