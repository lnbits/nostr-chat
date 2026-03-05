import { inputSanitizerService } from 'src/services/inputSanitizerService';
import { relaysService } from 'src/services/relaysService';
import type {
  ContactMetadata,
  ContactRecord,
  CreateContactInput,
  UpdateContactInput
} from 'src/types/contact';

interface RawContactStoreRecord {
  id: number;
  public_key: string;
  public_key_normalized?: string;
  name: string;
  name_normalized?: string;
  given_name?: string | null;
  given_name_normalized?: string;
  meta: unknown;
}

interface ContactStoreRecord {
  id: number;
  public_key: string;
  public_key_normalized: string;
  name: string;
  name_normalized: string;
  given_name: string | null;
  given_name_normalized: string;
  meta: ContactMetadata;
}

type DebugExecResult = Array<{
  columns: string[];
  values: unknown[][];
}>;

const CONTACTS_DB_NAME = 'contacts-indexeddb-v1';
const CONTACTS_DB_VERSION = 1;

const CONTACTS_STORE = 'contacts';
const CONTACTS_PUBLIC_KEY_INDEX = 'public_key_normalized';
const CONTACTS_NAME_INDEX = 'name_normalized';
const CONTACTS_GIVEN_NAME_INDEX = 'given_name_normalized';

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

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

function normalizeNameValue(value: string): string {
  return value.trim().toLowerCase();
}

function parseStoredMeta(value: unknown): ContactMetadata {
  if (typeof value === 'string') {
    return inputSanitizerService.parseStoredContactMetadata(value);
  }

  return inputSanitizerService.normalizeContactMetadata(value);
}

function normalizeRecord(raw: RawContactStoreRecord): ContactStoreRecord | null {
  const id = Number(raw.id ?? 0);
  const publicKey = String(raw.public_key ?? '').trim();
  if (!Number.isInteger(id) || id <= 0 || !publicKey) {
    return null;
  }

  const name = String(raw.name ?? '').trim() || publicKey;
  const givenName = normalizeOptionalString(raw.given_name);

  return {
    id,
    public_key: publicKey,
    public_key_normalized: publicKey.toLowerCase(),
    name,
    name_normalized: normalizeNameValue(name),
    given_name: givenName,
    given_name_normalized: normalizeNameValue(givenName ?? ''),
    meta: parseStoredMeta(raw.meta)
  };
}

function toContactRecord(record: ContactStoreRecord): ContactRecord {
  return {
    id: record.id,
    public_key: record.public_key,
    name: record.name,
    given_name: record.given_name,
    meta: parseStoredMeta(record.meta)
  };
}

function compareContactsByName(first: ContactStoreRecord, second: ContactStoreRecord): number {
  const byName = first.name.localeCompare(second.name, undefined, { sensitivity: 'base' });
  if (byName !== 0) {
    return byName;
  }

  const byPublicKey = first.public_key.localeCompare(second.public_key, undefined, {
    sensitivity: 'base'
  });
  if (byPublicKey !== 0) {
    return byPublicKey;
  }

  return first.id - second.id;
}

function contactMetaEquals(first: ContactMetadata, second: ContactMetadata): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}

class ContactsService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    await this.ensureInitialized();
  }

  async listContacts(): Promise<ContactRecord[]> {
    const records = await this.listNormalizedStoreRecords();
    const contacts = records.sort(compareContactsByName).map((record) => toContactRecord(record));
    return this.attachRelays(contacts);
  }

  async searchContacts(searchText: string): Promise<ContactRecord[]> {
    const query = searchText.trim().toLowerCase();
    if (!query) {
      return this.listContacts();
    }

    const records = await this.listNormalizedStoreRecords();
    const filteredRecords = records.filter((record) => {
      return (
        record.public_key_normalized.includes(query) ||
        record.name_normalized.includes(query) ||
        record.given_name_normalized.includes(query)
      );
    });

    const contacts = filteredRecords.sort(compareContactsByName).map((record) => toContactRecord(record));
    return this.attachRelays(contacts);
  }

  async getContactById(id: number): Promise<ContactRecord | null> {
    if (!Number.isInteger(id) || id <= 0) {
      return null;
    }

    const db = await this.getDatabase();
    const transaction = db.transaction(CONTACTS_STORE, 'readonly');
    const store = transaction.objectStore(CONTACTS_STORE);
    const rawRecord = await requestToPromise<RawContactStoreRecord | undefined>(
      store.get(id) as IDBRequest<RawContactStoreRecord | undefined>
    );
    await waitForTransaction(transaction);

    const record = rawRecord ? normalizeRecord(rawRecord) : null;
    if (!record) {
      return null;
    }

    const [contact] = await this.attachRelays([toContactRecord(record)]);
    return contact ?? null;
  }

  async getContactByPublicKey(publicKey: string): Promise<ContactRecord | null> {
    const normalizedPublicKey = inputSanitizerService.normalizePublicKey(publicKey);
    if (!normalizedPublicKey) {
      return null;
    }

    const db = await this.getDatabase();
    const transaction = db.transaction(CONTACTS_STORE, 'readonly');
    const store = transaction.objectStore(CONTACTS_STORE);
    const index = store.index(CONTACTS_PUBLIC_KEY_INDEX);
    const rawRecord = await requestToPromise<RawContactStoreRecord | undefined>(
      index.get(normalizedPublicKey.toLowerCase()) as IDBRequest<RawContactStoreRecord | undefined>
    );
    await waitForTransaction(transaction);

    const record = rawRecord ? normalizeRecord(rawRecord) : null;
    if (!record) {
      return null;
    }

    const [contact] = await this.attachRelays([toContactRecord(record)]);
    return contact ?? null;
  }

  async publicKeyExists(publicKey: string): Promise<boolean> {
    const normalizedPublicKey = inputSanitizerService.normalizePublicKey(publicKey);
    if (!normalizedPublicKey) {
      return false;
    }

    const db = await this.getDatabase();
    const transaction = db.transaction(CONTACTS_STORE, 'readonly');
    const store = transaction.objectStore(CONTACTS_STORE);
    const index = store.index(CONTACTS_PUBLIC_KEY_INDEX);
    const count = await requestToPromise<number>(
      index.count(IDBKeyRange.only(normalizedPublicKey.toLowerCase()))
    );
    await waitForTransaction(transaction);

    return count > 0;
  }

  async createContact(input: CreateContactInput): Promise<ContactRecord | null> {
    const publicKey = inputSanitizerService.normalizePublicKey(input.public_key);
    if (!publicKey) {
      return null;
    }

    const name = input.name.trim() || publicKey;
    const givenName = input.given_name?.trim() || null;
    const meta = inputSanitizerService.normalizeContactMetadata(input.meta);

    const record: Omit<ContactStoreRecord, 'id'> = {
      public_key: publicKey,
      public_key_normalized: publicKey.toLowerCase(),
      name,
      name_normalized: normalizeNameValue(name),
      given_name: givenName,
      given_name_normalized: normalizeNameValue(givenName ?? ''),
      meta
    };

    const db = await this.getDatabase();
    const transaction = db.transaction(CONTACTS_STORE, 'readwrite');
    const store = transaction.objectStore(CONTACTS_STORE);

    try {
      const insertedId = await requestToPromise<IDBValidKey>(
        store.add(record) as IDBRequest<IDBValidKey>
      );
      await waitForTransaction(transaction);

      const contact = toContactRecord({
        ...record,
        id: Number(insertedId)
      });
      const relays = await relaysService.replaceRelaysForPublicKey(contact.public_key, input.relays ?? []);
      return { ...contact, relays };
    } catch (error) {
      if (isConstraintError(error)) {
        return null;
      }

      console.error('Failed to create contact in IndexedDB.', error);
      return null;
    }
  }

  async updateContact(id: number, input: UpdateContactInput): Promise<ContactRecord | null> {
    if (!Number.isInteger(id) || id <= 0) {
      return null;
    }

    const db = await this.getDatabase();
    const transaction = db.transaction(CONTACTS_STORE, 'readwrite');
    const store = transaction.objectStore(CONTACTS_STORE);
    const rawExistingRecord = await requestToPromise<RawContactStoreRecord | undefined>(
      store.get(id) as IDBRequest<RawContactStoreRecord | undefined>
    );
    const existingRecord = rawExistingRecord ? normalizeRecord(rawExistingRecord) : null;
    if (!existingRecord) {
      await waitForTransaction(transaction);
      return null;
    }

    const previousContact = toContactRecord(existingRecord);
    const nextRecord: ContactStoreRecord = {
      ...existingRecord
    };
    let didUpdateRecord = false;

    if (input.public_key !== undefined) {
      const publicKey = inputSanitizerService.normalizePublicKey(input.public_key);
      if (!publicKey) {
        await waitForTransaction(transaction);
        return null;
      }

      const normalizedPublicKey = publicKey.toLowerCase();
      if (
        nextRecord.public_key !== publicKey ||
        nextRecord.public_key_normalized !== normalizedPublicKey
      ) {
        nextRecord.public_key = publicKey;
        nextRecord.public_key_normalized = normalizedPublicKey;
        didUpdateRecord = true;
      }
    }

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) {
        await waitForTransaction(transaction);
        return null;
      }

      const normalizedName = normalizeNameValue(name);
      if (nextRecord.name !== name || nextRecord.name_normalized !== normalizedName) {
        nextRecord.name = name;
        nextRecord.name_normalized = normalizedName;
        didUpdateRecord = true;
      }
    }

    if (input.given_name !== undefined) {
      const givenName = input.given_name?.trim() || null;
      const normalizedGivenName = normalizeNameValue(givenName ?? '');
      if (
        nextRecord.given_name !== givenName ||
        nextRecord.given_name_normalized !== normalizedGivenName
      ) {
        nextRecord.given_name = givenName;
        nextRecord.given_name_normalized = normalizedGivenName;
        didUpdateRecord = true;
      }
    }

    if (input.meta !== undefined) {
      const nextMeta = inputSanitizerService.normalizeContactMetadata(input.meta);
      if (!contactMetaEquals(nextRecord.meta, nextMeta)) {
        nextRecord.meta = nextMeta;
        didUpdateRecord = true;
      }
    }

    if (didUpdateRecord) {
      store.put(nextRecord);
    }

    try {
      await waitForTransaction(transaction);
    } catch (error) {
      if (isConstraintError(error)) {
        return null;
      }

      console.error('Failed to update contact in IndexedDB.', error);
      return null;
    }

    const contact = toContactRecord(nextRecord);

    if (input.relays === undefined) {
      const didPublicKeyChange =
        previousContact.public_key.toLowerCase() !== contact.public_key.toLowerCase();
      if (!didPublicKeyChange) {
        const [mapped] = await this.attachRelays([contact]);
        return mapped ?? contact;
      }

      const preservedRelays = await relaysService.listRelaysByPublicKey(previousContact.public_key);
      const relays = await relaysService.replaceRelaysForPublicKey(contact.public_key, preservedRelays);
      await relaysService.deleteRelaysForPublicKey(previousContact.public_key);
      return { ...contact, relays };
    }

    const relays = await relaysService.replaceRelaysForPublicKey(contact.public_key, input.relays);
    if (previousContact.public_key.toLowerCase() !== contact.public_key.toLowerCase()) {
      await relaysService.deleteRelaysForPublicKey(previousContact.public_key);
    }

    return { ...contact, relays };
  }

  async deleteContact(id: number): Promise<boolean> {
    if (!Number.isInteger(id) || id <= 0) {
      return false;
    }

    const db = await this.getDatabase();
    const transaction = db.transaction(CONTACTS_STORE, 'readwrite');
    const store = transaction.objectStore(CONTACTS_STORE);
    const rawExistingRecord = await requestToPromise<RawContactStoreRecord | undefined>(
      store.get(id) as IDBRequest<RawContactStoreRecord | undefined>
    );
    const existingRecord = rawExistingRecord ? normalizeRecord(rawExistingRecord) : null;
    if (!existingRecord) {
      await waitForTransaction(transaction);
      return false;
    }

    store.delete(id);

    try {
      await waitForTransaction(transaction);
    } catch (error) {
      console.error('Failed to delete contact in IndexedDB.', error);
      return false;
    }

    await relaysService.deleteRelaysForPublicKey(existingRecord.public_key);
    return true;
  }

  async debugExec(sql: string, params?: unknown): Promise<DebugExecResult> {
    if (!import.meta.env.DEV) {
      throw new Error('debugExec is available only in development mode.');
    }

    void sql;
    void params;

    const contacts = await this.listContacts();
    return [
      {
        columns: ['id', 'public_key', 'name', 'given_name', 'meta', 'relays'],
        values: contacts.map((contact) => [
          contact.id,
          contact.public_key,
          contact.name,
          contact.given_name,
          contact.meta,
          contact.relays ?? []
        ])
      }
    ];
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.initializeDatabase();
    }

    await this.initPromise;
  }

  private async initializeDatabase(): Promise<void> {
    const [db] = await Promise.all([this.openDatabase(), relaysService.init()]);
    this.dbPromise = Promise.resolve(db);
  }

  private async getDatabase(): Promise<IDBDatabase> {
    await this.ensureInitialized();

    if (!this.dbPromise) {
      throw new Error('Contacts IndexedDB is not initialized.');
    }

    return this.dbPromise;
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (!canUseIndexedDb()) {
      return Promise.reject(new Error('IndexedDB is not available in this environment.'));
    }

    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = window.indexedDB.open(CONTACTS_DB_NAME, CONTACTS_DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        const transaction = request.transaction;
        if (!transaction) {
          return;
        }

        const contactsStore = db.objectStoreNames.contains(CONTACTS_STORE)
          ? transaction.objectStore(CONTACTS_STORE)
          : db.createObjectStore(CONTACTS_STORE, { keyPath: 'id', autoIncrement: true });

        if (!contactsStore.indexNames.contains(CONTACTS_PUBLIC_KEY_INDEX)) {
          contactsStore.createIndex(CONTACTS_PUBLIC_KEY_INDEX, CONTACTS_PUBLIC_KEY_INDEX, {
            unique: true
          });
        }
        if (!contactsStore.indexNames.contains(CONTACTS_NAME_INDEX)) {
          contactsStore.createIndex(CONTACTS_NAME_INDEX, CONTACTS_NAME_INDEX, {
            unique: false
          });
        }
        if (!contactsStore.indexNames.contains(CONTACTS_GIVEN_NAME_INDEX)) {
          contactsStore.createIndex(CONTACTS_GIVEN_NAME_INDEX, CONTACTS_GIVEN_NAME_INDEX, {
            unique: false
          });
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
        reject(request.error ?? new Error('Failed to open contacts IndexedDB database.'));
      };

      request.onblocked = () => {
        console.error('Contacts IndexedDB open request is blocked by another tab.');
      };
    });
  }

  private async listNormalizedStoreRecords(): Promise<ContactStoreRecord[]> {
    const db = await this.getDatabase();
    const transaction = db.transaction(CONTACTS_STORE, 'readonly');
    const store = transaction.objectStore(CONTACTS_STORE);
    const rawRecords = await requestToPromise<RawContactStoreRecord[]>(
      store.getAll() as IDBRequest<RawContactStoreRecord[]>
    );
    await waitForTransaction(transaction);

    return rawRecords
      .map((record) => normalizeRecord(record))
      .filter((record): record is ContactStoreRecord => record !== null);
  }

  private async attachRelays(contacts: ContactRecord[]): Promise<ContactRecord[]> {
    if (contacts.length === 0) {
      return contacts;
    }

    return Promise.all(
      contacts.map(async (contact) => ({
        ...contact,
        relays: await relaysService.listRelaysByPublicKey(contact.public_key)
      }))
    );
  }
}

export const contactsService = new ContactsService();
