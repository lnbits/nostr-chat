import { App } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';

export interface NativeAppStateListenerHandle {
  remove: () => void;
}

export function isNativeAndroidRuntime(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export function startNativeAndroidAppStateListener(
  listener: (isActive: boolean) => void
): NativeAppStateListenerHandle | null {
  if (!isNativeAndroidRuntime()) {
    return null;
  }

  let removed = false;
  let appStateHandle: PluginListenerHandle | null = null;

  void App.addListener('appStateChange', (state) => {
    listener(state.isActive);
  })
    .then((handle) => {
      if (removed) {
        void handle.remove();
        return;
      }

      appStateHandle = handle;
    })
    .catch((error) => {
      console.warn('Failed to start native Android app state listener.', error);
    });

  return {
    remove: () => {
      removed = true;
      void appStateHandle?.remove();
      appStateHandle = null;
    },
  };
}
