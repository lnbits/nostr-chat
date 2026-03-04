import { dbService, type AppDatabase } from 'src/services/dbService';
import { inputSanitizerService } from 'src/services/inputSanitizerService';
import type { ContactRelay } from 'src/types/contact';

type SqlExecParams = Parameters<AppDatabase['exec']>[1];

const CONTACT_RELAYS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS contact_relays (
    public_key TEXT NOT NULL,
    relay_ws TEXT NOT NULL,
    PRIMARY KEY (public_key, relay_ws)
  );
`;

const CONTACT_RELAYS_INDEXES_SQL = `
  CREATE INDEX IF NOT EXISTS idx_contact_relays_public_key ON contact_relays(public_key COLLATE NOCASE);
  CREATE INDEX IF NOT EXISTS idx_contact_relays_relay_ws ON contact_relays(relay_ws COLLATE NOCASE);
`;

class RelaysService {
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    await this.ensureInitialized();
  }

  async listRelaysByPublicKey(publicKey: string): Promise<ContactRelay[]> {
    const normalizedPublicKey = inputSanitizerService.normalizePublicKey(publicKey);
    if (!normalizedPublicKey) {
      return [];
    }

    const db = await this.getDatabase();
    const rows = this.queryRows(
      db,
      `
        SELECT relay_ws
        FROM contact_relays
        WHERE LOWER(public_key) = LOWER(?)
        ORDER BY relay_ws COLLATE NOCASE ASC
      `,
      [normalizedPublicKey]
    );

    return rows
      .map((row) => {
        const url = String(row[0] ?? '').trim();
        if (!url) {
          return null;
        }

        const relay: ContactRelay = {
          url,
          read: true,
          write: true
        };

        return relay;
      })
      .filter((relay): relay is ContactRelay => relay !== null);
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

  async createRelay(publicKey: string, relay: ContactRelay): Promise<boolean> {
    const normalizedPublicKey = inputSanitizerService.normalizePublicKey(publicKey);
    const normalizedRelayUrl = inputSanitizerService.normalizeContactRelayUrl(relay);
    if (!normalizedPublicKey || !normalizedRelayUrl) {
      return false;
    }

    const db = await this.getDatabase();
    const statement = db.prepare('INSERT OR IGNORE INTO contact_relays (public_key, relay_ws) VALUES (?, ?)');

    try {
      statement.run([normalizedPublicKey, normalizedRelayUrl]);
    } catch (error) {
      console.error('Failed to create contact relay', error);
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

    const db = await this.getDatabase();
    const statement = db.prepare(
      `
        UPDATE contact_relays
        SET relay_ws = ?
        WHERE LOWER(public_key) = LOWER(?) AND relay_ws = ?
      `
    );

    try {
      statement.run([normalizedNextRelayUrl, normalizedPublicKey, normalizedPreviousRelayWs]);
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

  async deleteRelay(publicKey: string, relayWs: string): Promise<boolean> {
    const normalizedPublicKey = inputSanitizerService.normalizePublicKey(publicKey);
    const normalizedRelayWs = inputSanitizerService.normalizeRelayWs(relayWs);
    if (!normalizedPublicKey || !normalizedRelayWs) {
      return false;
    }

    const db = await this.getDatabase();
    const statement = db.prepare(
      'DELETE FROM contact_relays WHERE LOWER(public_key) = LOWER(?) AND relay_ws = ?'
    );

    try {
      statement.run([normalizedPublicKey, normalizedRelayWs]);
    } finally {
      statement.free();
    }

    const hasChanges = db.getRowsModified() > 0;
    if (hasChanges) {
      await dbService.persist();
    }

    return hasChanges;
  }

  async replaceRelaysForPublicKey(publicKey: string, relays: ContactRelay[]): Promise<ContactRelay[]> {
    const normalizedPublicKey = inputSanitizerService.normalizePublicKey(publicKey);
    if (!normalizedPublicKey) {
      return [];
    }

    const normalizedRelayUrls = inputSanitizerService.normalizeContactRelayUrls(relays);
    const db = await this.getDatabase();
    const deleteStatement = db.prepare('DELETE FROM contact_relays WHERE LOWER(public_key) = LOWER(?)');
    const insertStatement = db.prepare('INSERT OR IGNORE INTO contact_relays (public_key, relay_ws) VALUES (?, ?)');

    try {
      db.run('BEGIN TRANSACTION');
      deleteStatement.run([normalizedPublicKey]);

      for (const relayUrl of normalizedRelayUrls) {
        insertStatement.run([normalizedPublicKey, relayUrl]);
      }

      db.run('COMMIT');
    } catch (error) {
      try {
        db.run('ROLLBACK');
      } catch {
        // No-op: rollback failure should not hide the original issue.
      }

      console.error('Failed to replace contact relays', error);
      return this.listRelaysByPublicKey(normalizedPublicKey);
    } finally {
      deleteStatement.free();
      insertStatement.free();
    }

    await dbService.persist();
    return this.listRelaysByPublicKey(normalizedPublicKey);
  }

  async deleteRelaysForPublicKey(publicKey: string): Promise<boolean> {
    const normalizedPublicKey = inputSanitizerService.normalizePublicKey(publicKey);
    if (!normalizedPublicKey) {
      return false;
    }

    const db = await this.getDatabase();
    const statement = db.prepare('DELETE FROM contact_relays WHERE LOWER(public_key) = LOWER(?)');

    try {
      statement.run([normalizedPublicKey]);
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
    const didResetSchema = this.ensureSchema(db);
    if (didResetSchema) {
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

  private ensureSchema(db: AppDatabase): boolean {
    const hasTable = this.hasSchemaObject(db, 'table', 'contact_relays');
    if (!hasTable) {
      db.run(CONTACT_RELAYS_TABLE_SQL);
      db.run(CONTACT_RELAYS_INDEXES_SQL);
      return true;
    }

    const columns = this.queryRows(db, 'PRAGMA table_info(contact_relays)');
    const hasPublicKey = columns.some((row) => String(row[1] ?? '') === 'public_key');
    const hasRelayWs = columns.some((row) => String(row[1] ?? '') === 'relay_ws');

    if (!hasPublicKey || !hasRelayWs) {
      db.run('DROP TABLE contact_relays');
      db.run(CONTACT_RELAYS_TABLE_SQL);
      db.run(CONTACT_RELAYS_INDEXES_SQL);
      return true;
    }

    db.run(CONTACT_RELAYS_INDEXES_SQL);
    return false;
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
