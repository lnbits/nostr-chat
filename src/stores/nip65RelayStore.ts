import { defineStore } from 'pinia';
import { createRelayListStoreSetup } from 'src/stores/relayListStoreFactory';

export type { RelayListEntry } from 'src/stores/relayListStoreFactory';

export const useNip65RelayStore = defineStore(
  'nip65RelayStore',
  createRelayListStoreSetup({
    storageKey: 'nip65_relays',
  })
);
