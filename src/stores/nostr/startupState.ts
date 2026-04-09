export const STARTUP_STEP_DEFINITIONS = [
  { id: 'logged-in-profile', order: 1, label: 'Logged-in user profile/contact metadata' },
  { id: 'logged-in-relays', order: 2, label: 'Logged-in user relay list' },
  { id: 'my-relay-list', order: 3, label: 'My NIP-65 relay list' },
  { id: 'private-preferences', order: 4, label: 'Encrypted private preferences' },
  { id: 'private-contact-list', order: 5, label: 'Encrypted private contact list' },
  { id: 'group-identity-secrets', order: 6, label: 'Group identity secret storage' },
  { id: 'private-contact-profiles', order: 7, label: 'Private contact profile metadata' },
  { id: 'private-contact-relays', order: 8, label: 'Private contact relay lists' },
  { id: 'contact-cursor-data', order: 9, label: 'Per-contact cursor data' },
  { id: 'private-message-events', order: 10, label: 'Private message events' },
  { id: 'recent-chat-profiles', order: 11, label: 'Recent chat contact profiles' },
  { id: 'recent-chat-relays', order: 12, label: 'Recent chat contact relay lists' },
] as const;

export type StartupStepId = (typeof STARTUP_STEP_DEFINITIONS)[number]['id'];
export type StartupStepStatus = 'pending' | 'in_progress' | 'success' | 'error';

export interface StartupStepSnapshot {
  id: StartupStepId;
  order: number;
  label: string;
  status: StartupStepStatus;
  startedAt: number | null;
  completedAt: number | null;
  durationMs: number | null;
  errorMessage: string | null;
}

export interface StartupDisplaySnapshot {
  stepId: StartupStepId | null;
  label: string | null;
  status: StartupStepStatus | null;
  showProgress: boolean;
}

export function createInitialStartupStepSnapshots(): StartupStepSnapshot[] {
  return STARTUP_STEP_DEFINITIONS.map((step) => ({
    ...step,
    status: 'pending',
    startedAt: null,
    completedAt: null,
    durationMs: null,
    errorMessage: null,
  }));
}

export function beginStartupStepSnapshotValue(
  step: StartupStepSnapshot,
  now: number
): StartupStepSnapshot {
  if (step.status === 'in_progress') {
    return step;
  }

  return {
    ...step,
    status: 'in_progress',
    startedAt: now,
    completedAt: null,
    durationMs: null,
    errorMessage: null,
  };
}

export function completeStartupStepSnapshotValue(
  step: StartupStepSnapshot,
  now: number
): StartupStepSnapshot {
  const startedAt = step.startedAt ?? now;
  return {
    ...step,
    status: 'success',
    startedAt,
    completedAt: now,
    durationMs: Math.max(0, now - startedAt),
    errorMessage: null,
  };
}

export function failStartupStepSnapshotValue(
  step: StartupStepSnapshot,
  error: unknown,
  now: number
): StartupStepSnapshot {
  const startedAt = step.startedAt ?? now;
  return {
    ...step,
    status: 'error',
    startedAt,
    completedAt: now,
    durationMs: Math.max(0, now - startedAt),
    errorMessage: error instanceof Error ? error.message : String(error),
  };
}

export function resetStartupStepSnapshotsValue(): StartupStepSnapshot[] {
  return createInitialStartupStepSnapshots();
}
