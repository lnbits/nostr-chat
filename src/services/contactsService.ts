import { dbService, type AppDatabase } from 'src/services/dbService';
import { inputSanitizerService } from 'src/services/inputSanitizerService';
import { relaysService } from 'src/services/relaysService';
import type {
  ContactMetadata,
  ContactRecord,
  CreateContactInput,
  UpdateContactInput
} from 'src/types/contact';

type SqlExecParams = Parameters<AppDatabase['exec']>[1];

const CONTACTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_key TEXT NOT NULL,
    name TEXT NOT NULL,
    given_name TEXT NULL,
    meta TEXT NOT NULL
  );
`;

const CONTACTS_INDEXES_SQL = `
  CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_public_key_unique ON contacts(public_key COLLATE NOCASE);
  CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name COLLATE NOCASE);
`;

const CONTACT_SELECT_SQL = `
  SELECT id, public_key, name, given_name, meta
  FROM contacts
`;

function parseStoredMeta(value: unknown): ContactMetadata {
  return inputSanitizerService.parseStoredContactMetadata(value);
}

function serializeContactMeta(meta: ContactMetadata | undefined): string {
  return inputSanitizerService.serializeContactMetadata(meta);
}

function rowToContact(row: unknown[]): ContactRecord {
  return {
    id: Number(row[0]),
    public_key: String(row[1] ?? ''),
    name: String(row[2] ?? ''),
    given_name: row[3] == null ? null : String(row[3]),
    meta: parseStoredMeta(row[4])
  };
}

function mapContactRows(rows: unknown[][]): ContactRecord[] {
  return rows.map((row) => rowToContact(row));
}

class ContactsService {
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    await this.ensureInitialized();
  }

  async listContacts(): Promise<ContactRecord[]> {
    const db = await this.getDatabase();
    const rows = this.queryRows(db, `${CONTACT_SELECT_SQL} ORDER BY name COLLATE NOCASE ASC`);
    return this.attachRelays(mapContactRows(rows));
  }

  async searchContacts(searchText: string): Promise<ContactRecord[]> {
    const query = searchText.trim().toLowerCase();

    if (!query) {
      return this.listContacts();
    }

    const likeQuery = `%${query}%`;
    const db = await this.getDatabase();
    const rows = this.queryRows(
      db,
      `
        ${CONTACT_SELECT_SQL}
        WHERE
          LOWER(public_key) LIKE ?
          OR LOWER(name) LIKE ?
          OR LOWER(COALESCE(given_name, '')) LIKE ?
        ORDER BY name COLLATE NOCASE ASC
      `,
      [likeQuery, likeQuery, likeQuery]
    );

    return this.attachRelays(mapContactRows(rows));
  }

  async getContactById(id: number): Promise<ContactRecord | null> {
    const db = await this.getDatabase();
    const contact = this.querySingleRow(db, `${CONTACT_SELECT_SQL} WHERE id = ? LIMIT 1`, [id]);
    if (!contact) {
      return null;
    }

    const [mapped] = await this.attachRelays([rowToContact(contact)]);
    return mapped ?? null;
  }

  async getContactByPublicKey(publicKey: string): Promise<ContactRecord | null> {
    const normalized = inputSanitizerService.normalizePublicKey(publicKey);
    if (!normalized) {
      return null;
    }

    const db = await this.getDatabase();
    const contact = this.querySingleRow(
      db,
      `${CONTACT_SELECT_SQL} WHERE LOWER(public_key) = LOWER(?) LIMIT 1`,
      [normalized]
    );
    if (!contact) {
      return null;
    }

    const [mapped] = await this.attachRelays([rowToContact(contact)]);
    return mapped ?? null;
  }

  async publicKeyExists(publicKey: string): Promise<boolean> {
    const normalized = inputSanitizerService.normalizePublicKey(publicKey);
    if (!normalized) {
      return false;
    }

    const db = await this.getDatabase();
    const statement = db.prepare(
      'SELECT 1 FROM contacts WHERE LOWER(public_key) = LOWER(?) LIMIT 1'
    );

    try {
      statement.bind([normalized]);
      return statement.step();
    } finally {
      statement.free();
    }
  }

  async createContact(input: CreateContactInput): Promise<ContactRecord | null> {
    const publicKey = inputSanitizerService.normalizePublicKey(input.public_key);
    if (!publicKey) {
      return null;
    }

    const name = input.name.trim() || publicKey;
    const givenName = input.given_name?.trim() || null;
    const meta = inputSanitizerService.normalizeContactMetadata(input.meta);

    const db = await this.getDatabase();
    const insertStatement = db.prepare(
      'INSERT INTO contacts (public_key, name, given_name, meta) VALUES (?, ?, ?, ?)'
    );
    try {
      insertStatement.run([publicKey, name, givenName, serializeContactMeta(meta)]);
    } catch (error) {
      console.error('Failed to insert contact', error);
      return null;
    } finally {
      insertStatement.free();
    }

    const inserted = this.querySingleRow(
      db,
      `${CONTACT_SELECT_SQL} WHERE id = last_insert_rowid() LIMIT 1`
    );
    if (!inserted) {
      return null;
    }

    const contact = rowToContact(inserted);
    const relays = await relaysService.replaceRelaysForPublicKey(contact.public_key, input.relays ?? []);
    await dbService.persist();

    return { ...contact, relays };
  }

  async updateContact(id: number, input: UpdateContactInput): Promise<ContactRecord | null> {
    const db = await this.getDatabase();
    const existingRow = this.querySingleRow(db, `${CONTACT_SELECT_SQL} WHERE id = ? LIMIT 1`, [id]);
    if (!existingRow) {
      return null;
    }

    const previousContact = rowToContact(existingRow);
    const updates: Array<{
      field: 'public_key' | 'name' | 'given_name' | 'meta';
      value: string | null;
    }> = [];

    if (input.public_key !== undefined) {
      const publicKey = inputSanitizerService.normalizePublicKey(input.public_key);
      if (!publicKey) {
        return null;
      }

      updates.push({ field: 'public_key', value: publicKey });
    }

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) {
        return null;
      }

      updates.push({ field: 'name', value: name });
    }

    if (input.given_name !== undefined) {
      const givenName = input.given_name?.trim() || null;
      updates.push({ field: 'given_name', value: givenName });
    }

    if (input.meta !== undefined) {
      updates.push({ field: 'meta', value: serializeContactMeta(input.meta) });
    }

    if (updates.length === 0 && input.relays === undefined) {
      return this.getContactById(id);
    }

    if (updates.length > 0) {
      const setClause = updates.map((update) => `${update.field} = ?`).join(', ');
      const params: Array<number | string | null> = updates.map((update) => update.value);
      params.push(id);

      const updateStatement = db.prepare(`UPDATE contacts SET ${setClause} WHERE id = ?`);
      try {
        updateStatement.run(params);
      } catch (error) {
        console.error('Failed to update contact', error);
        return null;
      } finally {
        updateStatement.free();
      }

      if (db.getRowsModified() > 0) {
        await dbService.persist();
      }
    }

    const contact = await this.getContactById(id);
    if (!contact) {
      return null;
    }

    if (input.relays === undefined) {
      const didPublicKeyChange =
        previousContact.public_key.toLowerCase() !== contact.public_key.toLowerCase();
      if (!didPublicKeyChange) {
        return contact;
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
    const db = await this.getDatabase();
    const existingRow = this.querySingleRow(db, `${CONTACT_SELECT_SQL} WHERE id = ? LIMIT 1`, [id]);
    if (!existingRow) {
      return false;
    }

    const existingPublicKey = String(existingRow[1] ?? '').trim();
    const deleteStatement = db.prepare('DELETE FROM contacts WHERE id = ?');
    try {
      deleteStatement.run([id]);
    } finally {
      deleteStatement.free();
    }

    const hasChanges = db.getRowsModified() > 0;
    if (hasChanges) {
      if (existingPublicKey) {
        await relaysService.deleteRelaysForPublicKey(existingPublicKey);
      }

      await dbService.persist();
    }

    return hasChanges;
  }

  async debugExec(
    sql: string,
    params?: SqlExecParams
  ): Promise<ReturnType<AppDatabase['exec']>> {
    if (!import.meta.env.DEV) {
      throw new Error('debugExec is available only in development mode.');
    }

    const db = await this.getDatabase();
    return this.queryForDebug(db, sql, params);
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.initializeSchema();
    }

    await this.initPromise;
  }

  private async initializeSchema(): Promise<void> {
    const db = await dbService.getDatabase();

    db.run(CONTACTS_TABLE_SQL);
    await relaysService.init();
    const didMigrateSchema = this.ensureSchema(db);
    const didNormalizeMeta = this.normalizeStoredMeta(db);
    db.run(CONTACTS_INDEXES_SQL);
    this.seedContacts(db);

    if (didMigrateSchema || didNormalizeMeta) {
      await dbService.persist();
    }
  }

  private async getDatabase(): Promise<AppDatabase> {
    await this.ensureInitialized();
    return dbService.getDatabase();
  }

  private seedContacts(db: AppDatabase): void {
    void db;
  }

  private async attachRelays(contacts: ContactRecord[]): Promise<ContactRecord[]> {
    if (contacts.length === 0) {
      return contacts;
    }

    const withRelays = await Promise.all(
      contacts.map(async (contact) => ({
        ...contact,
        relays: await relaysService.listRelaysByPublicKey(contact.public_key)
      }))
    );

    return withRelays;
  }

  private ensureSchema(db: AppDatabase): boolean {
    const rows = this.queryRows(db, 'PRAGMA table_info(contacts)');
    const hasGivenName = rows.some((row) => String(row[1] ?? '') === 'given_name');

    if (!hasGivenName) {
      db.run('ALTER TABLE contacts ADD COLUMN given_name TEXT NULL');
      return true;
    }

    return false;
  }

  private normalizeStoredMeta(db: AppDatabase): boolean {
    const rows = this.queryRows(db, 'SELECT id, meta FROM contacts');
    if (rows.length === 0) {
      return false;
    }

    let didChange = false;
    const updateStatement = db.prepare('UPDATE contacts SET meta = ? WHERE id = ?');

    try {
      for (const row of rows) {
        const id = Number(row[0] ?? 0);
        if (!id) {
          continue;
        }

        const rawMeta = typeof row[1] === 'string' ? row[1] : '';
        const normalizedMeta = serializeContactMeta(parseStoredMeta(row[1]));

        if (rawMeta !== normalizedMeta) {
          updateStatement.run([normalizedMeta, id]);
          didChange = true;
        }
      }
    } finally {
      updateStatement.free();
    }

    return didChange;
  }

  private queryRows(db: AppDatabase, sql: string, params?: SqlExecParams): unknown[][] {
    const statement = db.prepare(sql);

    try {
      if (params !== undefined) {
        statement.bind(params);
      }

      const rows: unknown[][] = [];
      while (statement.step()) {
        rows.push(statement.get());
      }

      return rows;
    } finally {
      statement.free();
    }
  }

  private querySingleRow(
    db: AppDatabase,
    sql: string,
    params?: SqlExecParams
  ): unknown[] | null {
    const rows = this.queryRows(db, sql, params);
    return rows[0] ?? null;
  }

  private queryForDebug(
    db: AppDatabase,
    sql: string,
    params?: SqlExecParams
  ): ReturnType<AppDatabase['exec']> {
    const statement = db.prepare(sql);

    try {
      if (params !== undefined) {
        statement.bind(params);
      }

      const columns = statement.getColumnNames();
      if (columns.length === 0) {
        return [];
      }

      const values: unknown[][] = [];
      while (statement.step()) {
        values.push(statement.get());
      }

      return [{ columns, values }];
    } finally {
      statement.free();
    }
  }
}

export const contactsService = new ContactsService();
