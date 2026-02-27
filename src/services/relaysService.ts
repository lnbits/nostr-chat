import { dbService, type AppDatabase } from 'src/services/dbService';

type SqlExecParams = Parameters<AppDatabase['exec']>[1];

const CONTACT_RELAYS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS contact_relays (
    contact_id INTEGER NOT NULL,
    relay_ws TEXT NOT NULL,
    PRIMARY KEY (contact_id, relay_ws),
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
  );
`;

const CONTACT_RELAYS_INDEXES_SQL = `
  CREATE INDEX IF NOT EXISTS idx_contact_relays_contact_id ON contact_relays(contact_id);
  CREATE INDEX IF NOT EXISTS idx_contact_relays_relay_ws ON contact_relays(relay_ws COLLATE NOCASE);
`;

function parseContactId(contactId: number): number | null {
  if (!Number.isInteger(contactId) || contactId <= 0) {
    return null;
  }

  return contactId;
}

function normalizeRelayWs(value: string): string | null {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalizeRelays(relays: string[]): string[] {
  const uniqueRelays = new Set<string>();

  for (const relay of relays) {
    const normalized = normalizeRelayWs(relay);
    if (!normalized) {
      continue;
    }

    uniqueRelays.add(normalized);
  }

  return Array.from(uniqueRelays);
}

class RelaysService {
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    await this.ensureInitialized();
  }

  async listRelaysByContactId(contactId: number): Promise<string[]> {
    const normalizedContactId = parseContactId(contactId);
    if (!normalizedContactId) {
      return [];
    }

    const db = await this.getDatabase();
    const rows = this.queryRows(
      db,
      `
        SELECT relay_ws
        FROM contact_relays
        WHERE contact_id = ?
        ORDER BY relay_ws COLLATE NOCASE ASC
      `,
      [normalizedContactId]
    );

    return rows.map((row) => String(row[0] ?? ''));
  }

  async listAllRelays(): Promise<string[]> {
    const db = await this.getDatabase();
    const rows = this.queryRows(
      db,
      `
        SELECT DISTINCT relay_ws
        FROM contact_relays
        ORDER BY relay_ws COLLATE NOCASE ASC
      `
    );

    return rows.map((row) => String(row[0] ?? ''));
  }

  async createRelay(contactId: number, relayWs: string): Promise<boolean> {
    console.log('Creating relay for contact', contactId, relayWs);
    const normalizedContactId = parseContactId(contactId);
    const normalizedRelayWs = normalizeRelayWs(relayWs);
    if (!normalizedContactId || !normalizedRelayWs) {
      return false;
    }

    const db = await this.getDatabase();
    const statement = db.prepare(
      'INSERT OR IGNORE INTO contact_relays (contact_id, relay_ws) VALUES (?, ?)'
    );

    try {
      statement.run([normalizedContactId, normalizedRelayWs]);
    } catch (error) {
      console.error('Failed to create contact relay', error);
      return false;
    } finally {
      statement.free();
    }

    const hasChanges = db.getRowsModified() > 0;
    console.log('Create relay result for contact', contactId, relayWs, 'hasChanges:', hasChanges);
    if (hasChanges) {
      await dbService.persist();
    }

    return hasChanges;
  }

  async updateRelay(contactId: number, previousRelayWs: string, nextRelayWs: string): Promise<boolean> {
    const normalizedContactId = parseContactId(contactId);
    const normalizedPreviousRelayWs = normalizeRelayWs(previousRelayWs);
    const normalizedNextRelayWs = normalizeRelayWs(nextRelayWs);
    if (!normalizedContactId || !normalizedPreviousRelayWs || !normalizedNextRelayWs) {
      return false;
    }

    const db = await this.getDatabase();
    const statement = db.prepare(
      `
        UPDATE contact_relays
        SET relay_ws = ?
        WHERE contact_id = ? AND relay_ws = ?
      `
    );

    try {
      statement.run([normalizedNextRelayWs, normalizedContactId, normalizedPreviousRelayWs]);
    } catch (error) {
      console.error('Failed to update contact relay', error);
      return false;
    } finally {
      statement.free();
    }

    const hasChanges = db.getRowsModified() > 0;
    if (hasChanges) {
      await dbService.persist();
    }

    return hasChanges;
  }

  async deleteRelay(contactId: number, relayWs: string): Promise<boolean> {
    const normalizedContactId = parseContactId(contactId);
    const normalizedRelayWs = normalizeRelayWs(relayWs);
    if (!normalizedContactId || !normalizedRelayWs) {
      return false;
    }

    const db = await this.getDatabase();
    const statement = db.prepare('DELETE FROM contact_relays WHERE contact_id = ? AND relay_ws = ?');

    try {
      statement.run([normalizedContactId, normalizedRelayWs]);
    } finally {
      statement.free();
    }

    const hasChanges = db.getRowsModified() > 0;
    if (hasChanges) {
      await dbService.persist();
    }

    return hasChanges;
  }

  async replaceRelaysForContact(contactId: number, relays: string[]): Promise<string[]> {
    console.log('Replacing relays for contact', contactId, 'with relays:', relays);
    const normalizedContactId = parseContactId(contactId);
    if (!normalizedContactId) {
      return [];
    }

    const normalizedRelays = normalizeRelays(relays);
    const db = await this.getDatabase();
    const deleteStatement = db.prepare('DELETE FROM contact_relays WHERE contact_id = ?');
    const insertStatement = db.prepare(
      'INSERT OR IGNORE INTO contact_relays (contact_id, relay_ws) VALUES (?, ?)'
    );

    try {
      db.run('BEGIN TRANSACTION');
      deleteStatement.run([normalizedContactId]);

      for (const relayWs of normalizedRelays) {
        insertStatement.run([normalizedContactId, relayWs]);
      }

      db.run('COMMIT');
    } catch (error) {
      try {
        db.run('ROLLBACK');
      } catch {
        // No-op: rollback failure should not hide the original issue.
      }

      console.error('Failed to replace contact relays', error);
      return this.listRelaysByContactId(normalizedContactId);
    } finally {
      deleteStatement.free();
      insertStatement.free();
    }

    await dbService.persist();
    return normalizedRelays;
  }

  async deleteRelaysForContact(contactId: number): Promise<boolean> {
    const normalizedContactId = parseContactId(contactId);
    if (!normalizedContactId) {
      return false;
    }

    const db = await this.getDatabase();
    const statement = db.prepare('DELETE FROM contact_relays WHERE contact_id = ?');

    try {
      statement.run([normalizedContactId]);
    } finally {
      statement.free();
    }

    const hasChanges = db.getRowsModified() > 0;
    if (hasChanges) {
      await dbService.persist();
    }

    return hasChanges;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.initializeSchema();
    }

    await this.initPromise;
  }

  private async initializeSchema(): Promise<void> {
    const db = await dbService.getDatabase();
    const hadTable = this.hasSchemaObject(db, 'table', 'contact_relays');
    const hadContactIndex = this.hasSchemaObject(db, 'index', 'idx_contact_relays_contact_id');
    const hadRelayIndex = this.hasSchemaObject(db, 'index', 'idx_contact_relays_relay_ws');

    db.run(CONTACT_RELAYS_TABLE_SQL);
    db.run(CONTACT_RELAYS_INDEXES_SQL);

    if (!hadTable || !hadContactIndex || !hadRelayIndex) {
      await dbService.persist();
    }
  }

  private async getDatabase(): Promise<AppDatabase> {
    await this.ensureInitialized();
    return dbService.getDatabase();
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

  private hasSchemaObject(db: AppDatabase, objectType: 'table' | 'index', objectName: string): boolean {
    const rows = this.queryRows(
      db,
      `
        SELECT 1
        FROM sqlite_master
        WHERE type = ? AND name = ?
        LIMIT 1
      `,
      [objectType, objectName]
    );

    return rows.length > 0;
  }
}

export const relaysService = new RelaysService();
