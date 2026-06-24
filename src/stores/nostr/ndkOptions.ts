export interface AppNdkOptions {
  enableOutboxModel: boolean;
}

function readBooleanBuildEnv(value: unknown): boolean {
  return value === true || value === 'true';
}

export function createAppNdkOptions(env: Record<string, unknown> = process.env): AppNdkOptions {
  return {
    enableOutboxModel: !readBooleanBuildEnv(env.APP_E2E_DISABLE_NDK_OUTBOX),
  };
}
