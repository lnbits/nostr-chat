<template>
  <q-page class="register-page">
    <div class="register-shell">
      <div class="register-card scroll-card">
        <div class="register-card__eyebrow">new nostr identity</div>
        <h1 class="register-card__title">Create Account</h1>

        <p v-if="isCreatingAccount" class="register-card__subtitle">
          Generating a fresh Nostr keypair for this profile.
        </p>
        <p v-else class="register-card__subtitle">
          Your new account is ready. Download the secret before you continue.
        </p>

        <q-linear-progress
          v-if="isCreatingAccount"
          rounded
          size="10px"
          color="primary"
          track-color="dark"
          class="register-card__progress"
          :value="creationProgress"
        />

        <template v-else>
          <div class="register-card__secret">
            <div class="register-card__secret-label">Account Secret</div>
            <div class="register-card__secret-value">
              {{ generatedAccount?.nsec }}
            </div>
          </div>

          <div class="register-card__warning">
            This secret controls the account. Store it somewhere safe before logging in.
          </div>

          <div class="register-card__actions">
            <q-btn
              no-caps
              outline
              color="primary"
              icon="download"
              class="scroll-button register-card__button"
              label="Download Secret"
              :disable="!generatedAccount"
              @click="handleDownloadSecret"
            />

            <q-btn
              no-caps
              unelevated
              color="primary"
              icon="login"
              class="scroll-button register-card__button"
              label="Login Now"
              :disable="!generatedAccount"
              :loading="isLoggingIn"
              @click="handleLoginNow"
            />
          </div>
        </template>

        <q-btn
          no-caps
          flat
          color="primary"
          class="scroll-button register-card__button register-card__button--ghost"
          label="Back"
          :disable="isLoggingIn"
          @click="goBackToLogin"
        />

        <div v-if="registerError" class="register-card__error">
          {{ registerError }}
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import type { GeneratedNostrAccount } from '../types/auth';

const ACCOUNT_CREATION_DURATION_MS = 1400;

const router = useRouter();
const authStore = useAuthStore();

const generatedAccount = ref<GeneratedNostrAccount | null>(null);
const isCreatingAccount = ref(true);
const creationProgress = ref(0);
const isLoggingIn = ref(false);
const registerError = ref('');

let creationAnimationFrameId: number | null = null;
let creationCompletionFrameId: number | null = null;
let creationStartedAtMs: number | null = null;

onMounted(() => {
  initializeRegisterPage();
});

onBeforeUnmount(() => {
  clearCreationTimers();
});

function clearRegisterError(): void {
  registerError.value = '';
}

function initializeRegisterPage(): void {
  clearCreationTimers();
  clearRegisterError();
  generatedAccount.value = null;
  isCreatingAccount.value = true;
  creationProgress.value = 0;
  creationStartedAtMs = null;
  creationAnimationFrameId = window.requestAnimationFrame(updateCreationProgress);
}

function clearCreationTimers(): void {
  if (creationAnimationFrameId !== null) {
    window.cancelAnimationFrame(creationAnimationFrameId);
    creationAnimationFrameId = null;
  }

  if (creationCompletionFrameId !== null) {
    window.cancelAnimationFrame(creationCompletionFrameId);
    creationCompletionFrameId = null;
  }

  creationStartedAtMs = null;
}

function updateCreationProgress(timestampMs: number): void {
  if (creationStartedAtMs === null) {
    creationStartedAtMs = timestampMs;
  }

  const elapsedMs = timestampMs - creationStartedAtMs;
  const normalizedProgress = Math.min(elapsedMs / ACCOUNT_CREATION_DURATION_MS, 1);
  creationProgress.value = normalizedProgress;

  if (normalizedProgress < 1) {
    creationAnimationFrameId = window.requestAnimationFrame(updateCreationProgress);
    return;
  }

  creationAnimationFrameId = null;
  creationCompletionFrameId = window.requestAnimationFrame(() => {
    creationCompletionFrameId = null;
    generateAccount();
  });
}

function generateAccount(): void {
  try {
    generatedAccount.value = authStore.createAccount();
    isCreatingAccount.value = false;
  } catch (error) {
    registerError.value =
      error instanceof Error ? error.message : 'Failed to create a new account.';
  }
}

function handleDownloadSecret(): void {
  if (!generatedAccount.value) {
    return;
  }

  try {
    const secretFile = new Blob(
      [`${generatedAccount.value.npub}\n${generatedAccount.value.nsec}`],
      { type: 'text/plain;charset=utf-8' },
    );
    const objectUrl = URL.createObjectURL(secretFile);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `nostr-scroll-account-${generatedAccount.value.publicKeyHex.slice(0, 8)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    registerError.value =
      error instanceof Error ? error.message : 'Failed to download the account secret.';
  }
}

async function goBackToLogin(): Promise<void> {
  clearRegisterError();
  await router.replace({ name: 'login' });
}

async function handleLoginNow(): Promise<void> {
  if (isLoggingIn.value || !generatedAccount.value) {
    return;
  }

  clearRegisterError();
  isLoggingIn.value = true;
  try {
    await authStore.loginWithPrivateKey(generatedAccount.value.privateKeyHex);
    await router.replace({ name: 'home' });
  } catch (error) {
    registerError.value = error instanceof Error ? error.message : 'Failed to log in.';
  } finally {
    isLoggingIn.value = false;
  }
}
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  padding: 28px 20px;
}

.register-shell {
  width: min(100%, 520px);
  margin: 0 auto;
  padding-top: min(13vh, 120px);
}

.register-card {
  padding: 32px 28px;
  background:
    radial-gradient(circle at top left, rgba(29, 155, 240, 0.14), transparent 38%),
    radial-gradient(circle at bottom right, rgba(34, 197, 94, 0.08), transparent 36%),
    var(--scroll-surface);
}

.register-card__eyebrow {
  color: var(--scroll-accent-strong);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  margin-bottom: 16px;
}

.register-card__title {
  margin: 0;
  font-size: clamp(2.1rem, 7vw, 3.2rem);
  line-height: 0.98;
  font-weight: 900;
}

.register-card__subtitle {
  margin: 14px 0 24px;
  color: var(--scroll-text-muted);
  font-size: 1rem;
  line-height: 1.5;
}

.register-card__progress {
  margin-bottom: 24px;
}

.register-card__secret {
  padding: 16px 18px;
  margin-bottom: 16px;
  border: 1px solid var(--scroll-border);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.02);
}

.register-card__secret-label {
  margin-bottom: 8px;
  color: var(--scroll-text-muted);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.register-card__secret-value {
  font-size: 0.94rem;
  line-height: 1.55;
  word-break: break-all;
}

.register-card__warning {
  margin-bottom: 20px;
  padding: 14px 16px;
  border: 1px solid rgba(245, 158, 11, 0.22);
  border-radius: 18px;
  background: rgba(245, 158, 11, 0.08);
  color: color-mix(in srgb, var(--scroll-text) 90%, #fbbf24 10%);
  font-size: 0.95rem;
  line-height: 1.5;
}

.register-card__actions {
  display: grid;
  gap: 12px;
  margin-bottom: 10px;
}

.register-card__button {
  width: 100%;
  min-height: 50px;
  font-size: 1rem;
  font-weight: 800;
}

.register-card__button--ghost {
  min-height: 42px;
}

.register-card__error {
  margin-top: 16px;
  padding: 12px 14px;
  border: 1px solid rgba(251, 113, 133, 0.25);
  border-radius: 18px;
  background: rgba(251, 113, 133, 0.08);
  color: #fecdd3;
  font-size: 0.92rem;
  line-height: 1.45;
}
</style>
