import initSqlJs from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

type SqlJsStatic = Awaited<ReturnType<typeof initSqlJs>>;
type SqlJsDatabase = InstanceType<SqlJsStatic['Database']>;
type SqlExecParams = Parameters<SqlJsDatabase['exec']>[1];

const CHAT_DB_STORAGE_KEY = 'chat-data-sqlite-db-v1';
export const LOCAL_AUTHOR_PUBLIC_KEY = 'me';

export interface ChatRow {
  id: number;
  public_key: string;
  name: string;
  last_message: string;
  last_message_at: string | null;
  unread_count: number;
  meta: Record<string, unknown>;
}

export interface MessageRow {
  id: number;
  chat_it: number;
  author_public_key: string;
  message: string;
  created_at: string;
  meta: Record<string, unknown>;
}

export interface CreateChatInput {
  public_key: string;
  name: string;
  last_message?: string;
  last_message_at?: string | null;
  unread_count?: number;
  meta?: Record<string, unknown>;
}

export interface CreateMessageInput {
  chat_it: number;
  author_public_key: string;
  message: string;
  created_at?: string;
  meta?: Record<string, unknown>;
}

const CHATS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_key TEXT NOT NULL,
    name TEXT NOT NULL,
    last_message TEXT,
    last_message_at DATETIME,
    unread_count INTEGER NOT NULL DEFAULT 0,
    meta TEXT NOT NULL
  );
`;

const MESSAGES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_it INTEGER NOT NULL,
    author_public_key TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME NOT NULL,
    meta TEXT NOT NULL
  );
`;

const CHAT_INDEXES_SQL = `
  CREATE UNIQUE INDEX IF NOT EXISTS idx_chats_public_key_unique ON chats(public_key COLLATE NOCASE);
  CREATE INDEX IF NOT EXISTS idx_chats_last_message_at ON chats(last_message_at);
`;

const MESSAGE_INDEXES_SQL = `
  CREATE INDEX IF NOT EXISTS idx_messages_chat_it ON messages(chat_it);
  CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
`;

const CHAT_SELECT_SQL = `
  SELECT id, public_key, name, last_message, last_message_at, unread_count, meta
  FROM chats
`;

const MESSAGE_SELECT_SQL = `
  SELECT id, chat_it, author_public_key, message, created_at, meta
  FROM messages
`;

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = '';

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const output = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    output[index] = binary.charCodeAt(index);
  }

  return output;
}

function parseMeta(value: unknown): Record<string, unknown> {
  if (typeof value !== 'string') {
    return {};
  }

  if (!value.trim()) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function serializeMeta(meta: Record<string, unknown> | undefined): string {
  const normalized =
    meta && typeof meta === 'object' && !Array.isArray(meta) ? meta : {};
  return JSON.stringify(normalized);
}

function rowToChat(row: unknown[]): ChatRow {
  return {
    id: Number(row[0] ?? 0),
    public_key: String(row[1] ?? ''),
    name: String(row[2] ?? ''),
    last_message: String(row[3] ?? ''),
    last_message_at: row[4] == null ? null : String(row[4]),
    unread_count: Number(row[5] ?? 0),
    meta: parseMeta(row[6])
  };
}

function rowToMessage(row: unknown[]): MessageRow {
  return {
    id: Number(row[0] ?? 0),
    chat_it: Number(row[1] ?? 0),
    author_public_key: String(row[2] ?? ''),
    message: String(row[3] ?? ''),
    created_at: String(row[4] ?? ''),
    meta: parseMeta(row[5])
  };
}

class ChatDataService {
  private sqlPromise: Promise<SqlJsStatic> | null = null;
  private dbPromise: Promise<SqlJsDatabase> | null = null;

  async init(): Promise<void> {
    await this.getDatabase();
  }

  async listChats(): Promise<ChatRow[]> {
    const db = await this.getDatabase();
    const rows = this.queryRows(
      db,
      `${CHAT_SELECT_SQL} ORDER BY COALESCE(last_message_at, '') DESC, id DESC`
    );
    return rows.map((row) => rowToChat(row));
  }

  async getChatById(id: number): Promise<ChatRow | null> {
    const db = await this.getDatabase();
    const row = this.querySingleRow(db, `${CHAT_SELECT_SQL} WHERE id = ? LIMIT 1`, [id]);
    return row ? rowToChat(row) : null;
  }

  async getChatByPublicKey(publicKey: string): Promise<ChatRow | null> {
    const normalized = publicKey.trim();
    if (!normalized) {
      return null;
    }

    const db = await this.getDatabase();
    const row = this.querySingleRow(
      db,
      `${CHAT_SELECT_SQL} WHERE LOWER(public_key) = LOWER(?) LIMIT 1`,
      [normalized]
    );
    return row ? rowToChat(row) : null;
  }

  async createChat(input: CreateChatInput): Promise<ChatRow | null> {
    const publicKey = input.public_key.trim();
    const name = input.name.trim();
    const lastMessage = input.last_message?.trim() ?? '';
    const lastMessageAt = input.last_message_at ?? null;
    const unreadCount = Number.isFinite(input.unread_count) ? Number(input.unread_count) : 0;

    if (!publicKey || !name) {
      return null;
    }

    const db = await this.getDatabase();
    const statement = db.prepare(
      `
      INSERT INTO chats (public_key, name, last_message, last_message_at, unread_count, meta)
      VALUES (?, ?, ?, ?, ?, ?)
      `
    );

    try {
      statement.run([
        publicKey,
        name,
        lastMessage,
        lastMessageAt,
        unreadCount,
        serializeMeta(input.meta)
      ]);
    } catch (error) {
      console.error('Failed to create chat row', error);
      return null;
    } finally {
      statement.free();
    }

    const inserted = this.querySingleRow(
      db,
      `${CHAT_SELECT_SQL} WHERE id = last_insert_rowid() LIMIT 1`
    );
    if (inserted) {
      this.persistDatabase(db);
    }

    return inserted ? rowToChat(inserted) : null;
  }

  async updateChatPreview(
    chatId: number,
    lastMessage: string,
    lastMessageAt: string,
    unreadCount: number
  ): Promise<void> {
    const db = await this.getDatabase();
    const statement = db.prepare(
      `
      UPDATE chats
      SET last_message = ?, last_message_at = ?, unread_count = ?
      WHERE id = ?
      `
    );

    try {
      statement.run([lastMessage, lastMessageAt, unreadCount, chatId]);
    } finally {
      statement.free();
    }

    if (db.getRowsModified() > 0) {
      this.persistDatabase(db);
    }
  }

  async markChatAsRead(chatId: number): Promise<void> {
    const db = await this.getDatabase();
    const statement = db.prepare('UPDATE chats SET unread_count = 0 WHERE id = ?');

    try {
      statement.run([chatId]);
    } finally {
      statement.free();
    }

    if (db.getRowsModified() > 0) {
      this.persistDatabase(db);
    }
  }

  async listMessages(chatId: number): Promise<MessageRow[]> {
    const db = await this.getDatabase();
    const rows = this.queryRows(
      db,
      `${MESSAGE_SELECT_SQL} WHERE chat_it = ? ORDER BY created_at ASC, id ASC`,
      [chatId]
    );
    return rows.map((row) => rowToMessage(row));
  }

  async createMessage(input: CreateMessageInput): Promise<MessageRow | null> {
    const chatId = Number(input.chat_it);
    const authorPublicKey = input.author_public_key.trim();
    const message = input.message.trim();
    const createdAt = input.created_at?.trim() || new Date().toISOString();

    if (!Number.isInteger(chatId) || chatId <= 0 || !authorPublicKey || !message || !createdAt) {
      return null;
    }

    const db = await this.getDatabase();
    const statement = db.prepare(
      `
      INSERT INTO messages (chat_it, author_public_key, message, created_at, meta)
      VALUES (?, ?, ?, ?, ?)
      `
    );

    try {
      statement.run([chatId, authorPublicKey, message, createdAt, serializeMeta(input.meta)]);
    } catch (error) {
      console.error('Failed to create message row', error);
      return null;
    } finally {
      statement.free();
    }

    const inserted = this.querySingleRow(
      db,
      `${MESSAGE_SELECT_SQL} WHERE id = last_insert_rowid() LIMIT 1`
    );
    if (inserted) {
      this.persistDatabase(db);
    }

    return inserted ? rowToMessage(inserted) : null;
  }

  private async getDatabase(): Promise<SqlJsDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = this.createDatabase();
    }

    return this.dbPromise;
  }

  private async getSqlJs(): Promise<SqlJsStatic> {
    if (!this.sqlPromise) {
      this.sqlPromise = initSqlJs({
        locateFile: () => sqlWasmUrl
      });
    }

    return this.sqlPromise;
  }

  private async createDatabase(): Promise<SqlJsDatabase> {
    const SQL = await this.getSqlJs();
    const persistedBytes = this.loadPersistedDatabase();
    let db: SqlJsDatabase;

    if (persistedBytes) {
      try {
        db = new SQL.Database(persistedBytes);
      } catch (error) {
        console.error('Failed to restore persisted chat database. Recreating a fresh database.', error);
        this.clearPersistedDatabase();
        db = new SQL.Database();
      }
    } else {
      db = new SQL.Database();
    }

    db.run(CHATS_TABLE_SQL);
    db.run(MESSAGES_TABLE_SQL);
    db.run(CHAT_INDEXES_SQL);
    db.run(MESSAGE_INDEXES_SQL);

    return db;
  }

  private queryRows(db: SqlJsDatabase, sql: string, params?: SqlExecParams): unknown[][] {
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
    db: SqlJsDatabase,
    sql: string,
    params?: SqlExecParams
  ): unknown[] | null {
    const rows = this.queryRows(db, sql, params);
    return rows[0] ?? null;
  }

  private loadPersistedDatabase(): Uint8Array | null {
    if (!canUseStorage()) {
      return null;
    }

    const encoded = window.localStorage.getItem(CHAT_DB_STORAGE_KEY);
    if (!encoded) {
      return null;
    }

    try {
      return base64ToBytes(encoded);
    } catch (error) {
      console.error('Failed to decode persisted chat database bytes.', error);
      this.clearPersistedDatabase();
      return null;
    }
  }

  private persistDatabase(db: SqlJsDatabase): void {
    if (!canUseStorage()) {
      return;
    }

    try {
      const bytes = db.export();
      const encoded = bytesToBase64(bytes);
      window.localStorage.setItem(CHAT_DB_STORAGE_KEY, encoded);
    } catch (error) {
      console.error('Failed to persist chat database.', error);
    }
  }

  private clearPersistedDatabase(): void {
    if (!canUseStorage()) {
      return;
    }

    window.localStorage.removeItem(CHAT_DB_STORAGE_KEY);
  }
}

export const chatDataService = new ChatDataService();
