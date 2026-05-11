import {
  beginStartupTimedSnapshotValue,
  completeStartupTimedSnapshotValue,
  failStartupTimedSnapshotValue,
  getStartupInternalTaskDefinitionValue,
  resetStartupStepSnapshotsValue,
  resolveStartupStepIdValue,
  type StartupDisplaySnapshot,
  type StartupInternalTaskId,
  type StartupInternalTaskSnapshot,
  type StartupStepSnapshot,
  type StartupTrackId,
} from 'src/stores/nostr/startupState';
import type { Ref } from 'vue';

interface StartupRuntimeState {
  startupDisplayShownAt: number;
  startupDisplayTimer: ReturnType<typeof globalThis.setTimeout> | null;
  startupDisplayToken: number;
}

interface StartupRuntimeDeps {
  startupDisplay: Ref<StartupDisplaySnapshot>;
  startupState: StartupRuntimeState;
  startupSteps: Ref<StartupStepSnapshot[]>;
  startupStepMinProgressMs: number;
}

export function createStartupRuntime({
  startupDisplay,
  startupState,
  startupSteps,
  startupStepMinProgressMs,
}: StartupRuntimeDeps) {
  function clearStartupDisplayTimer(): void {
    if (startupState.startupDisplayTimer !== null) {
      globalThis.clearTimeout(startupState.startupDisplayTimer);
      startupState.startupDisplayTimer = null;
    }
  }

  function getStartupStepSnapshot(stepId: StartupTrackId): StartupStepSnapshot {
    const parentStepId = resolveStartupStepIdValue(stepId);
    const step = startupSteps.value.find((entry) => entry.id === stepId);
    if (step) {
      return step;
    }

    const parentStep = startupSteps.value.find((entry) => entry.id === parentStepId);
    if (parentStep) {
      return parentStep;
    }

    throw new Error(`Unknown startup step: ${stepId}`);
  }

  function getStartupInternalTaskSnapshot(
    taskId: StartupInternalTaskId
  ): StartupInternalTaskSnapshot | null {
    const taskDefinition = getStartupInternalTaskDefinitionValue(taskId);
    if (!taskDefinition) {
      return null;
    }

    const parentStep = getStartupStepSnapshot(taskDefinition.parentId);
    return parentStep.internalTasks.find((entry) => entry.id === taskId) ?? null;
  }

  function ensureStartupInternalTaskSnapshot(
    taskId: StartupInternalTaskId
  ): StartupInternalTaskSnapshot {
    const taskDefinition = getStartupInternalTaskDefinitionValue(taskId);
    if (!taskDefinition) {
      throw new Error(`Unknown startup task: ${taskId}`);
    }

    const parentStep = getStartupStepSnapshot(taskDefinition.parentId);
    const existingTask = parentStep.internalTasks.find((entry) => entry.id === taskId);
    if (existingTask) {
      return existingTask;
    }

    const nextTask: StartupInternalTaskSnapshot = {
      id: taskDefinition.id,
      label: taskDefinition.label,
      status: 'pending',
      startedAt: null,
      completedAt: null,
      durationMs: null,
      errorMessage: null,
    };
    parentStep.internalTasks.push(nextTask);
    return nextTask;
  }

  function getStartupTrackLabel(stepId: StartupTrackId): string {
    const internalTask = getStartupInternalTaskDefinitionValue(stepId);
    if (internalTask) {
      return internalTask.label;
    }

    const step = getStartupStepSnapshot(stepId);
    if (!step) {
      throw new Error(`Unknown startup step: ${stepId}`);
    }

    return step.label;
  }

  function showStartupStepProgress(stepId: StartupTrackId): void {
    const parentStepId = resolveStartupStepIdValue(stepId);
    startupState.startupDisplayToken += 1;
    startupState.startupDisplayShownAt = Date.now();
    clearStartupDisplayTimer();
    startupDisplay.value = {
      stepId: parentStepId,
      label: getStartupTrackLabel(stepId),
      status: 'in_progress',
      showProgress: true,
    };
  }

  function finalizeStartupStepDisplay(stepId: StartupTrackId, status: 'success' | 'error'): void {
    const parentStepId = resolveStartupStepIdValue(stepId);
    if (startupDisplay.value.stepId !== parentStepId) {
      return;
    }

    const displayToken = ++startupState.startupDisplayToken;
    const label = getStartupTrackLabel(stepId);
    const applyFinalState = () => {
      if (displayToken !== startupState.startupDisplayToken) {
        return;
      }

      startupDisplay.value = {
        stepId: parentStepId,
        label,
        status,
        showProgress: false,
      };
      startupState.startupDisplayTimer = null;
    };

    const elapsedMs =
      startupState.startupDisplayShownAt > 0 ? Date.now() - startupState.startupDisplayShownAt : 0;
    const remainingProgressMs = Math.max(startupStepMinProgressMs - elapsedMs, 0);
    clearStartupDisplayTimer();

    if (remainingProgressMs > 0) {
      startupState.startupDisplayTimer = globalThis.setTimeout(
        applyFinalState,
        remainingProgressMs
      );
      return;
    }

    applyFinalState();
  }

  function beginStartupStep(stepId: StartupTrackId): void {
    const now = Date.now();
    const internalTaskDefinition = getStartupInternalTaskDefinitionValue(stepId);
    const parentStep = getStartupStepSnapshot(stepId);
    const nextStep = beginStartupTimedSnapshotValue(parentStep, now);
    if (nextStep === parentStep) {
      if (internalTaskDefinition) {
        const task = ensureStartupInternalTaskSnapshot(internalTaskDefinition.id);
        Object.assign(task, beginStartupTimedSnapshotValue(task, now));
        showStartupStepProgress(stepId);
      }
      return;
    }

    Object.assign(parentStep, nextStep);
    if (internalTaskDefinition) {
      const task = ensureStartupInternalTaskSnapshot(internalTaskDefinition.id);
      Object.assign(task, beginStartupTimedSnapshotValue(task, now));
    }
    showStartupStepProgress(stepId);
  }

  function completeStartupStep(stepId: StartupTrackId): void {
    const now = Date.now();
    const internalTaskDefinition = getStartupInternalTaskDefinitionValue(stepId);
    if (internalTaskDefinition) {
      const task = ensureStartupInternalTaskSnapshot(internalTaskDefinition.id);
      Object.assign(task, completeStartupTimedSnapshotValue(task, now));
      if (
        'completeParentOnFinish' in internalTaskDefinition &&
        internalTaskDefinition.completeParentOnFinish === true
      ) {
        const parentStep = getStartupStepSnapshot(internalTaskDefinition.parentId);
        Object.assign(parentStep, completeStartupTimedSnapshotValue(parentStep, now));
      }
      finalizeStartupStepDisplay(stepId, 'success');
      return;
    }

    const step = getStartupStepSnapshot(stepId);
    Object.assign(step, completeStartupTimedSnapshotValue(step, now));
    finalizeStartupStepDisplay(stepId, 'success');
  }

  function failStartupStep(stepId: StartupTrackId, error: unknown): void {
    const now = Date.now();
    const internalTaskDefinition = getStartupInternalTaskDefinitionValue(stepId);
    if (internalTaskDefinition) {
      const task = ensureStartupInternalTaskSnapshot(internalTaskDefinition.id);
      Object.assign(task, failStartupTimedSnapshotValue(task, error, now));
      if (
        'completeParentOnFinish' in internalTaskDefinition &&
        internalTaskDefinition.completeParentOnFinish === true
      ) {
        const parentStep = getStartupStepSnapshot(internalTaskDefinition.parentId);
        Object.assign(parentStep, failStartupTimedSnapshotValue(parentStep, error, now));
      }
      finalizeStartupStepDisplay(stepId, 'error');
      return;
    }

    const step = getStartupStepSnapshot(stepId);
    Object.assign(step, failStartupTimedSnapshotValue(step, error, now));
    finalizeStartupStepDisplay(stepId, 'error');
  }

  function resetStartupStepTracking(): void {
    clearStartupDisplayTimer();
    startupState.startupDisplayToken += 1;
    startupState.startupDisplayShownAt = 0;
    startupSteps.value = resetStartupStepSnapshotsValue();
    startupDisplay.value = {
      stepId: null,
      label: null,
      status: null,
      showProgress: false,
    };
  }

  function createStartupBatchTracker(stepId: StartupTrackId): {
    beginItem: () => void;
    finishItem: (error?: unknown) => void;
    seal: () => void;
  } {
    let started = false;
    let sealed = false;
    let inFlightCount = 0;

    const maybeComplete = () => {
      if (!sealed || inFlightCount > 0) {
        return;
      }

      const internalTaskDefinition = getStartupInternalTaskDefinitionValue(stepId);
      if (internalTaskDefinition) {
        const task = getStartupInternalTaskSnapshot(internalTaskDefinition.id);
        if (task?.status === 'in_progress') {
          completeStartupStep(stepId);
        }
        return;
      }

      const step = getStartupStepSnapshot(stepId);
      if (step.status === 'in_progress') {
        completeStartupStep(stepId);
      }
    };

    return {
      beginItem() {
        if (!started) {
          beginStartupStep(stepId);
          started = true;
        }
        inFlightCount += 1;
      },
      finishItem(error?: unknown) {
        if (!started) {
          beginStartupStep(stepId);
          started = true;
        }

        inFlightCount = Math.max(0, inFlightCount - 1);
        if (error) {
          failStartupStep(stepId, error);
          return;
        }

        maybeComplete();
      },
      seal() {
        sealed = true;
        if (!started) {
          beginStartupStep(stepId);
          completeStartupStep(stepId);
          return;
        }

        maybeComplete();
      },
    };
  }

  return {
    beginStartupStep,
    clearStartupDisplayTimer,
    completeStartupStep,
    createStartupBatchTracker,
    failStartupStep,
    finalizeStartupStepDisplay,
    getStartupStepSnapshot,
    resetStartupStepTracking,
    showStartupStepProgress,
  };
}
