/// <reference types="@quasar/app-vite" />
/// <reference types="vite/client" />

declare global {
  interface Window {
    __appE2E__?: import('src/testing/e2eBridge').AppE2EBridge;
  }
}

export {};
