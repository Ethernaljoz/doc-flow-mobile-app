/**
 * Schéma SQLite (expo-sqlite SDK 57) + migrations versionnées par `PRAGMA user_version`.
 * Branché via `<SQLiteProvider databaseName={DATABASE_NAME} onInit={migrate} />`.
 */
import type { SQLiteDatabase } from 'expo-sqlite';

import type { Category, DocumentRecord, Note } from '@/models/types';
import { ensureTree } from '@/services/files';

export const DATABASE_NAME = 'docflow.db';

const DEFAULT_CATEGORIES: { name: string; color: string; icon: string }[] = [
  { name: 'Professionnel', color: '#3C87F7', icon: 'briefcase' },
  { name: 'Factures', color: '#E8590C', icon: 'receipt' },
  { name: 'Personnel', color: '#2F9E44', icon: 'person' },
  { name: 'Contrats', color: '#9C36B5', icon: 'doc.text' },
];

/** Migration idempotente exécutée avant le rendu des enfants du provider. */
export async function migrate(db: SQLiteDatabase): Promise<void> {
  ensureTree();

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  if (version === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = 'wal';
      PRAGMA foreign_keys = ON;

      CREATE TABLE categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        icon TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      );

      CREATE TABLE documents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        rel_path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        source TEXT NOT NULL,
        page_count INTEGER NOT NULL DEFAULT 1,
        size_bytes INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE document_pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        rel_path TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE document_tags (
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (document_id, tag_id)
      );

      CREATE TABLE notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '',
        body TEXT NOT NULL DEFAULT '',
        document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX idx_documents_category ON documents(category_id);
      CREATE INDEX idx_documents_updated ON documents(updated_at DESC);
      CREATE INDEX idx_pages_document ON document_pages(document_id, sort_order);
      CREATE INDEX idx_notes_document ON notes(document_id);
      CREATE INDEX idx_notes_updated ON notes(updated_at DESC);
    `);

    for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
      const c = DEFAULT_CATEGORIES[i];
      await db.runAsync(
        'INSERT INTO categories (name, color, icon, sort_order) VALUES (?, ?, ?, ?)',
        c.name,
        c.color,
        c.icon,
        i,
      );
    }

    version = 1;
  }

  // Prochaines migrations :
  // if (version === 1) { await db.execAsync(`CREATE VIRTUAL TABLE search USING fts5(...)`); version = 2; }

  await db.execAsync(`PRAGMA user_version = ${version}`);
}

// ── Lignes brutes → types du domaine ────────────────────────────────────────

type CategoryRow = { id: number; name: string; color: string; icon: string; sort_order: number };
type DocumentRow = {
  id: string;
  title: string;
  category_id: number | null;
  rel_path: string;
  file_type: string;
  source: string;
  page_count: number;
  size_bytes: number;
  created_at: number;
  updated_at: number;
};
type NoteRow = {
  id: string;
  title: string;
  body: string;
  document_id: string | null;
  created_at: number;
  updated_at: number;
};

export const mapCategory = (r: CategoryRow): Category => ({
  id: r.id,
  name: r.name,
  color: r.color,
  icon: r.icon,
  sortOrder: r.sort_order,
});

export const mapDocument = (r: DocumentRow): DocumentRecord => ({
  id: r.id,
  title: r.title,
  categoryId: r.category_id,
  relPath: r.rel_path,
  fileType: r.file_type as DocumentRecord['fileType'],
  source: r.source as DocumentRecord['source'],
  pageCount: r.page_count,
  sizeBytes: r.size_bytes,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const mapNote = (r: NoteRow): Note => ({
  id: r.id,
  title: r.title,
  body: r.body,
  documentId: r.document_id,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

// ── Requêtes de lecture (Phase 0) ──────────────────────────────────────────

export async function listCategories(db: SQLiteDatabase): Promise<Category[]> {
  const rows = await db.getAllAsync<CategoryRow>(
    'SELECT * FROM categories ORDER BY sort_order, name',
  );
  return rows.map(mapCategory);
}

export async function listDocuments(
  db: SQLiteDatabase,
  opts: { categoryId?: number | null; search?: string } = {},
): Promise<DocumentRecord[]> {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (opts.categoryId != null) {
    where.push('category_id = ?');
    params.push(opts.categoryId);
  }
  if (opts.search) {
    where.push('title LIKE ?');
    params.push(`%${opts.search}%`);
  }
  const sql = `SELECT * FROM documents ${
    where.length ? `WHERE ${where.join(' AND ')}` : ''
  } ORDER BY updated_at DESC`;
  const rows = await db.getAllAsync<DocumentRow>(sql, ...params);
  return rows.map(mapDocument);
}

export async function listNotes(db: SQLiteDatabase): Promise<Note[]> {
  const rows = await db.getAllAsync<NoteRow>('SELECT * FROM notes ORDER BY updated_at DESC');
  return rows.map(mapNote);
}

export async function countDocuments(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM documents');
  return row?.n ?? 0;
}

export async function getNote(db: SQLiteDatabase, id: string): Promise<Note | null> {
  const row = await db.getFirstAsync<NoteRow>('SELECT * FROM notes WHERE id = ?', id);
  return row ? mapNote(row) : null;
}

export async function getDocument(
  db: SQLiteDatabase,
  id: string,
): Promise<DocumentRecord | null> {
  const row = await db.getFirstAsync<DocumentRow>('SELECT * FROM documents WHERE id = ?', id);
  return row ? mapDocument(row) : null;
}

export async function notesForDocument(
  db: SQLiteDatabase,
  documentId: string,
): Promise<Note[]> {
  const rows = await db.getAllAsync<NoteRow>(
    'SELECT * FROM notes WHERE document_id = ? ORDER BY updated_at DESC',
    documentId,
  );
  return rows.map(mapNote);
}

export interface NoteInput {
  id: string;
  title: string;
  body: string;
  documentId?: string | null;
}

/** Insère ou met à jour une note. Retourne l'horodatage `updatedAt`. */
export async function upsertNote(db: SQLiteDatabase, note: NoteInput): Promise<number> {
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO notes (id, title, body, document_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       body = excluded.body,
       document_id = excluded.document_id,
       updated_at = excluded.updated_at`,
    note.id,
    note.title,
    note.body,
    note.documentId ?? null,
    now,
    now,
  );
  return now;
}

export async function deleteNote(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM notes WHERE id = ?', id);
}
