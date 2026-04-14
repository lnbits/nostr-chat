/// <reference types="@quasar/app-vite" />
/// <reference types="vite/client" />

declare global {
  interface Window {
    __appE2E__?: import('src/testing/e2eBridge').AppE2EBridge;
    __e2eNip07Decrypt?: (
      pubkey: string,
      value: string,
      scheme?: 'nip04' | 'nip44'
    ) => Promise<string>;
    __e2eNip07Encrypt?: (
      pubkey: string,
      value: string,
      scheme?: 'nip04' | 'nip44'
    ) => Promise<string>;
    __e2eNip07GetPublicKey?: () => Promise<string>;
    __e2eNip07GetRelays?: () => Promise<Record<string, { read: boolean; write: boolean }>>;
    __e2eNip07SignEvent?: (event: Record<string, unknown>) => Promise<{ sig: string }>;
  }
}

export {};
