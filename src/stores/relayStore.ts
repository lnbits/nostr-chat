import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { DEFAULT_RELAYS } from 'src/constants/relays';

const RELAYS_STORAGE_KEY = 'relays';

export interface RelayListEntry {
  url: string;
  read: boolean;
  write: boolean;
}

function hasStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function normalizeRelayEntry(entry: unknown): RelayListEntry | null {
  if (typeof entry === 'string') {
    const url = entry.trim();
    if (!url) {
      return null;
    }

    return {
      url,
      read: true,
      write: true
    };
  }

  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const value = entry as Partial<RelayListEntry>;
  const url = typeof value.url === 'string' ? value.url.trim() : '';
  if (!url) {
    return null;
  }

  return {
    url,
    read: typeof value.read === 'boolean' ? value.read : true,
    write: typeof value.write === 'boolean' ? value.write : true
  };
}

function readStoredRelays(): RelayListEntry[] | null {
  if (!hasStorage()) {
    return null;
  }

  try {
    const value = window.localStorage.getItem(RELAYS_STORAGE_KEY);
    if (value === null  || value === undefined || value.trim() === '') {
      return null;
    }

    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return null;
    }

    const relays = parsed
      .map((entry) => normalizeRelayEntry(entry))
      .filter((entry): entry is RelayListEntry => entry !== null);

    return relays;
  } catch (error) {
    console.warn('Failed to read relay list from localStorage', error);
    return null;
  }
}

function writeStoredRelays(relays: RelayListEntry[]): void {
  if (!hasStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(RELAYS_STORAGE_KEY, JSON.stringify(relays));
  } catch (error) {
    console.warn('Failed to persist relay list to localStorage', error);
  }
}

export const useRelayStore = defineStore('relayStore', () => {
  const relayEntries = ref<RelayListEntry[]>([]);
  const relays = computed(() => relayEntries.value.map((entry) => entry.url));
  const isInitialized = ref(false);

  function defaultRelayEntries(): RelayListEntry[] {
    return DEFAULT_RELAYS.map((url) => ({
      url,
      read: true,
      write: true
    }));
  }

  function ensureInitialized(): void {
    if (!isInitialized.value) {
      init();
    }
  }

  function init(): void {
    if (isInitialized.value) {
      return;
    }

    const storedRelays = readStoredRelays();
    relayEntries.value = storedRelays ? [...storedRelays] : defaultRelayEntries();
    writeStoredRelays(relayEntries.value);
    isInitialized.value = true;
  }

  function addRelay(relay: string): void {
    const value = relay.trim();
    if (!value) {
      return;
    }

    ensureInitialized();
    relayEntries.value = [
      ...relayEntries.value,
      {
        url: value,
        read: true,
        write: true
      }
    ];
    writeStoredRelays(relayEntries.value);
  }

  function removeRelay(index: number): void {
    ensureInitialized();
    relayEntries.value = relayEntries.value.filter((_, relayIndex) => relayIndex !== index);
    writeStoredRelays(relayEntries.value);
  }

  function restoreDefaults(): void {
    ensureInitialized();
    relayEntries.value = defaultRelayEntries();
    writeStoredRelays(relayEntries.value);
  }

  function getRelayFlags(index: number): Pick<RelayListEntry, 'read' | 'write'> {
    ensureInitialized();
    const entry = relayEntries.value[index];
    return {
      read: entry?.read ?? true,
      write: entry?.write ?? true
    };
  }

  function setRelayFlags(index: number, flags: Partial<Pick<RelayListEntry, 'read' | 'write'>>): void {
    ensureInitialized();

    const current = relayEntries.value[index];
    if (!current) {
      return;
    }

    relayEntries.value = relayEntries.value.map((entry, relayIndex) => {
      if (relayIndex !== index) {
        return entry;
      }

      return {
        ...entry,
        read: typeof flags.read === 'boolean' ? flags.read : entry.read,
        write: typeof flags.write === 'boolean' ? flags.write : entry.write
      };
    });

    writeStoredRelays(relayEntries.value);
  }

  return {
    relayEntries,
    relays,
    init,
    addRelay,
    removeRelay,
    restoreDefaults,
    getRelayFlags,
    setRelayFlags
  };
});
