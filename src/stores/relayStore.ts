import { defineStore } from 'pinia';
import { DEFAULT_RELAYS } from 'src/constants/relays';
import { createRelayListStoreSetup } from 'src/stores/relayListStoreFactory';

export type { RelayListEntry } from 'src/stores/relayListStoreFactory';

export const useRelayStore = defineStore(
  'relayStore',
  createRelayListStoreSetup({
    storageKey: 'relays',
    defaultRelays: DEFAULT_RELAYS,
  })
);
