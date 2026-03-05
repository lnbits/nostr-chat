import { inputSanitizerService } from 'src/services/inputSanitizerService';
import type { ContactRelay } from 'src/types/contact';

interface RelayRecord {
  public_key: string;
  public_key_normalized: string;
  relay_ws: string;
}

const RELAYS_DB_NAME = 'contact-relays-indexeddb-v1';
const RELAYS_DB_VERSION = 1;

const RELAYS_STORE = 'contact_relays';
const RELAYS_PUBLIC_KEY_INDEX = 'public_key_normalized';
const RELAYS_WS_INDEX = 'relay_ws';

function canUseIndexedDb(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function isConstraintError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === 'ConstraintError';
  }

  if (!error || typeof error !== 'object') {
    return false;
  }

  const name = 'name' in error ? String(error.name) : '';
  return name === 'ConstraintError';
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB request failed.'));
    };
  });
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
    };
    transaction.onabort = () => {
      reject(transaction.error ?? new Error('IndexedDB transaction aborted.'));
    };
  });
}

function compareRelayUrls(first: string, second: string): number {
  const byValue = first.localeCompare(second, undefined, { sensitivity: 'base' });
  if (byValue !== 0) {
    return byValue;
  }

  return first.localeCompare(second);
}

function toContactRelay(record: RelayRecord): ContactRelay {
  return {
    url: record.relay_ws,
    read: true,
    write: true
  };
}

class RelaysService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    await this.ensureInitialized();
  }

  async listRelaysByPublicKey(publicKey: string): Promise<ContactRelay[]> {
    const normalizedPublicKey = inputSanitizerService.normalizePublicKey(publicKey);
    if (!normalizedPublicKey) {
      return [];
    }

    const normalizedPublicKeyLower = normalizedPublicKey.toLowerCase();
    const db = await this.getDatabase();
    const transaction = db.transaction(RELAYS_STORE, 'readonly');
    const store = transaction.objectStore(RELAYS_STORE);
    const index = store.index(RELAYS_PUBLIC_KEY_INDEX);
    const records = await requestToPromise<RelayRecord[]>(
      index.getAll(IDBKeyRange.only(normalizedPublicKeyLower)) as IDBRequest<RelayRecord[]>
    );
    await waitForTransaction(transaction);

    return records
      .map((record) => toContactRelay(record))
      .sort((first, second) => compareRelayUrls(first.url, second.url));
  }

  async listAllRelays(): Promise<string[]> {
    const db = await this.getDatabase();
    const transaction = db.transaction(RELAYS_STORE, 'readonly');
    const store = transaction.objectStore(RELAYS_STORE);
    const records = await requestToPromise<RelayRecord[]>(
      store.getAll() as IDBRequest<RelayRecord[]>
    );
    await waitForTransaction(transaction);

    const uniqueRelayUrls = new Set<string>();
    for (const record of records) {
      const relayWs = String(record.relay_ws ?? '').trim();
      if (!relayWs) {
        continue;
      }

      uniqueRelayUrls.add(relayWs);
    }

    return Array.from(uniqueRelayUrls).sort(compareRelayUrls);
  }

  async createRelay(publicKey: string, relay: ContactRelay): Promise<boolean> {
    const normalizedPublicKey = inputSanitizerService.normalizePublicKey(publicKey);
    const normalizedRelayUrl = inputSanitizerService.normalizeContactRelayUrl(relay);
    if (!normalizedPublicKey || !normalizedRelayUrl) {
      return false;
    }

    const normalizedPublicKeyLower = normalizedPublicKey.toLowerCase();
    const db = await this.getDatabase();
    const transaction = db.transaction(RELAYS_STORE, 'readwrite');
    const store = transaction.objectStore(RELAYS_STORE);

    try {
      const existing = await requestToPromise<RelayRecord | undefined>(
        store.get([normalizedPublicKeyLower, normalizedRelayUrl]) as IDBRequest<RelayRecord | undefined>
      );
      if (existing) {
        await waitForTransaction(transaction);
        return false;
      }

      store.add({
        public_key: normalizedPublicKey,
        public_key_normalized: normalizedPublicKeyLower,
        relay_ws: normalizedRelayUrl
      } as RelayRecord);
      await waitForTransaction(transaction);
      return true;
    } catch (error) {
      if (isConstraintError(error)) {
        return false;
      }

      console.error('Failed to create contact relay in IndexedDB.', error);
      return false;
    }
  }

  async updateRelay(
    publicKey: string,
    previousRelayWs: string,
    nextRelay: ContactRelay
  ): Promise<boolean> {
    const normalizedPublicKey = inputSanitizerService.normalizePublicKey(publicKey);
    const normalizedPreviousRelayWs = inputSanitizerService.normalizeRelayWs(previousRelayWs);
    const normalizedNextRelayUrl = inputSanitizerService.normalizeContactRelayUrl(nextRelay);
    if (!normalizedPublicKey || !normalizedPreviousRelayWs || !normalizedNextRelayUrl) {
      return false;
    }

    if (normalizedPreviousRelayWs === normalizedNextRelayUrl) {
      return false;
    }

    const normalizedPublicKeyLower = normalizedPublicKey.toLowerCase();
    const previousKey: [string, string] = [normalizedPublicKeyLower, normalizedPreviousRelayWs];
    const nextKey: [string, string] = [normalizedPublicKeyLower, normalizedNextRelayUrl];
    const db = await this.getDatabase();
    const transaction = db.transaction(RELAYS_STORE, 'readwrite');
    const store = transaction.objectStore(RELAYS_STORE);

    try {
      const existing = await requestToPromise<RelayRecord | undefined>(
        store.get(previousKey) as IDBRequest<RelayRecord | undefined>
      );
      if (!existing) {
        await waitForTransaction(transaction);
        return false;
      }

      const conflict = await requestToPromise<RelayRecord | undefined>(
        store.get(nextKey) as IDBRequest<RelayRecord | undefined>
      );
      if (conflict) {
        await waitForTransaction(transaction);
        return false;
      }

      store.delete(previousKey);
      store.add({
        ...existing,
        public_key: normalizedPublicKey,
        public_key_normalized: normalizedPublicKeyLower,
        relay_ws: normalizedNextRelayUrl
      } as RelayRecord);
      await waitForTransaction(transaction);
      return true;
    } catch (error) {
      if (isConstraintError(error)) {
        return false;
      }

      console.error('Failed to update contact relay in IndexedDB.', error);
      return false;
    }
  }

  async deleteRelay(publicKey: string, relayWs: string): Promise<boolean> {
    const normalizedPublicKey = inputSanitizerService.normalizePublicKey(publicKey);
    const normalizedRelayWs = inputSanitizerService.normalizeRelayWs(relayWs);
    if (!normalizedPublicKey || !normalizedRelayWs) {
      return false;
    }

    const normalizedPublicKeyLower = normalizedPublicKey.toLowerCase();
    const key: [string, string] = [normalizedPublicKeyLower, normalizedRelayWs];
    const db = await this.getDatabase();
    const transaction = db.transaction(RELAYS_STORE, 'readwrite');
    const store = transaction.objectStore(RELAYS_STORE);

    try {
      const existing = await requestToPromise<RelayRecord | undefined>(
        store.get(key) as IDBRequest<RelayRecord | undefined>
      );
      if (!existing) {
        await waitForTransaction(transaction);
        return false;
      }

      store.delete(key);
      await waitForTransaction(transaction);
      return true;
    } catch (error) {
      console.error('Failed to delete contact relay in IndexedDB.', error);
      return false;
    }
  }

  async replaceRelaysForPublicKey(publicKey: string, relays: ContactRelay[]): Promise<ContactRelay[]> {
    const normalizedPublicKey = inputSanitizerService.normalizePublicKey(publicKey);
    if (!normalizedPublicKey) {
      return [];
    }

    const normalizedPublicKeyLower = normalizedPublicKey.toLowerCase();
    const normalizedRelayUrls = inputSanitizerService.normalizeContactRelayUrls(relays);
    const db = await this.getDatabase();
    const transaction = db.transaction(RELAYS_STORE, 'readwrite');
    const store = transaction.objectStore(RELAYS_STORE);

    try {
      await this.deleteRecordsByPublicKey(store, normalizedPublicKeyLower);

      for (const relayUrl of normalizedRelayUrls) {
        store.put({
          public_key: normalizedPublicKey,
          public_key_normalized: normalizedPublicKeyLower,
          relay_ws: relayUrl
        } as RelayRecord);
      }

      await waitForTransaction(transaction);
      return this.listRelaysByPublicKey(normalizedPublicKey);
    } catch (error) {
      console.error('Failed to replace contact relays in IndexedDB.', error);
      return this.listRelaysByPublicKey(normalizedPublicKey);
    }
  }

  async deleteRelaysForPublicKey(publicKey: string): Promise<boolean> {
    const normalizedPublicKey = inputSanitizerService.normalizePublicKey(publicKey);
    if (!normalizedPublicKey) {
      return false;
    }

    const normalizedPublicKeyLower = normalizedPublicKey.toLowerCase();
    const db = await this.getDatabase();
    const transaction = db.transaction(RELAYS_STORE, 'readwrite');
    const store = transaction.objectStore(RELAYS_STORE);

    try {
      const didDelete = await this.deleteRecordsByPublicKey(store, normalizedPublicKeyLower);
      await waitForTransaction(transaction);
      return didDelete;
    } catch (error) {
      console.error('Failed to delete contact relays in IndexedDB.', error);
      return false;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.initializeDatabase();
    }

    await this.initPromise;
  }

  private async initializeDatabase(): Promise<void> {
    const db = await this.openDatabase();
    this.dbPromise = Promise.resolve(db);
  }

  private async getDatabase(): Promise<IDBDatabase> {
    await this.ensureInitialized();

    if (!this.dbPromise) {
      throw new Error('Relays IndexedDB is not initialized.');
    }

    return this.dbPromise;
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (!canUseIndexedDb()) {
      return Promise.reject(new Error('IndexedDB is not available in this environment.'));
    }

    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = window.indexedDB.open(RELAYS_DB_NAME, RELAYS_DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        const transaction = request.transaction;
        if (!transaction) {
          return;
        }

        const relaysStore = db.objectStoreNames.contains(RELAYS_STORE)
          ? transaction.objectStore(RELAYS_STORE)
          : db.createObjectStore(RELAYS_STORE, {
              keyPath: [RELAYS_PUBLIC_KEY_INDEX, RELAYS_WS_INDEX]
            });
        if (!relaysStore.indexNames.contains(RELAYS_PUBLIC_KEY_INDEX)) {
          relaysStore.createIndex(RELAYS_PUBLIC_KEY_INDEX, RELAYS_PUBLIC_KEY_INDEX, { unique: false });
        }
        if (!relaysStore.indexNames.contains(RELAYS_WS_INDEX)) {
          relaysStore.createIndex(RELAYS_WS_INDEX, RELAYS_WS_INDEX, { unique: false });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
        };
        resolve(db);
      };

      request.onerror = () => {
        reject(request.error ?? new Error('Failed to open relays IndexedDB database.'));
      };

      request.onblocked = () => {
        console.error('Relays IndexedDB open request is blocked by another tab.');
      };
    });
  }

  private deleteRecordsByPublicKey(
    store: IDBObjectStore,
    publicKeyNormalized: string
  ): Promise<boolean> {
    const index = store.index(RELAYS_PUBLIC_KEY_INDEX);
    const range = IDBKeyRange.only(publicKeyNormalized);

    return new Promise<boolean>((resolve, reject) => {
      let didDelete = false;
      const request = index.openCursor(range);

      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve(didDelete);
          return;
        }

        didDelete = true;
        cursor.delete();
        cursor.continue();
      };

      request.onerror = () => {
        reject(request.error ?? new Error('Failed to delete relay records for contact.'));
      };
    });
  }
}

export const relaysService = new RelaysService();
