/**
 * Schéma SQLite (expo-sqlite SDK 57) + migrations versionnées par `PRAGMA user_version`.
 * Branché via `<SQLiteProvider databaseName={DATABASE_NAME} onInit={migrate} />`.
 */
import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  Category,
  DocumentPage,
  DocumentRecord,
  DocumentSource,
  FileType,
  Note,
  Tag,
} from '@/models/types';
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

  if (version === 1) {
    // Recherche plein-texte sur les notes (contenu externe = table `notes`).
    // Tolérant : si FTS5 était indisponible, `searchNotes` retombe sur LIKE.
    try {
      await db.execAsync(`
        CREATE VIRTUAL TABLE notes_fts USING fts5(
          title, body, content='notes', content_rowid='rowid'
        );

        CREATE TRIGGER notes_ai AFTER INSERT ON notes BEGIN
          INSERT INTO notes_fts(rowid, title, body) VALUES (new.rowid, new.title, new.body);
        END;
        CREATE TRIGGER notes_ad AFTER DELETE ON notes BEGIN
          INSERT INTO notes_fts(notes_fts, rowid, title, body)
          VALUES ('delete', old.rowid, old.title, old.body);
        END;
        CREATE TRIGGER notes_au AFTER UPDATE ON notes BEGIN
          INSERT INTO notes_fts(notes_fts, rowid, title, body)
          VALUES ('delete', old.rowid, old.title, old.body);
          INSERT INTO notes_fts(rowid, title, body) VALUES (new.rowid, new.title, new.body);
        END;

        INSERT INTO notes_fts(rowid, title, body) SELECT rowid, title, body FROM notes;
      `);
    } catch (e) {
      console.warn('[db] FTS5 indisponible, recherche notes en mode LIKE', e);
    }

    version = 2;
  }

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
type DocumentPageRow = {
  id: number;
  document_id: string;
  rel_path: string;
  sort_order: number;
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

export const mapPage = (r: DocumentPageRow): DocumentPage => ({
  id: r.id,
  documentId: r.document_id,
  relPath: r.rel_path,
  sortOrder: r.sort_order,
});

export const mapTag = (r: { id: number; name: string }): Tag => ({ id: r.id, name: r.name });

// ── Requêtes de lecture (Phase 0) ──────────────────────────────────────────

export async function listCategories(db: SQLiteDatabase): Promise<Category[]> {
  const rows = await db.getAllAsync<CategoryRow>(
    'SELECT * FROM categories ORDER BY sort_order, name',
  );
  return rows.map(mapCategory);
}

export type DocumentSort = 'recent' | 'name' | 'size';

const SORT_SQL: Record<DocumentSort, string> = {
  recent: 'd.updated_at DESC',
  name: 'd.title COLLATE NOCASE ASC',
  size: 'd.size_bytes DESC',
};

export async function listDocuments(
  db: SQLiteDatabase,
  opts: {
    categoryId?: number | null;
    tagId?: number | null;
    search?: string;
    sort?: DocumentSort;
  } = {},
): Promise<DocumentRecord[]> {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (opts.categoryId != null) {
    where.push('d.category_id = ?');
    params.push(opts.categoryId);
  }
  if (opts.search) {
    where.push('d.title LIKE ?');
    params.push(`%${opts.search}%`);
  }
  if (opts.tagId != null) {
    where.push('EXISTS (SELECT 1 FROM document_tags dt WHERE dt.document_id = d.id AND dt.tag_id = ?)');
    params.push(opts.tagId);
  }
  const sql = `SELECT d.* FROM documents d ${
    where.length ? `WHERE ${where.join(' AND ')}` : ''
  } ORDER BY ${SORT_SQL[opts.sort ?? 'recent']}`;
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

export async function setNoteDocument(
  db: SQLiteDatabase,
  noteId: string,
  documentId: string | null,
): Promise<void> {
  await db.runAsync(
    'UPDATE notes SET document_id = ?, updated_at = ? WHERE id = ?',
    documentId,
    Date.now(),
    noteId,
  );
}

/** Transforme une saisie libre en requête FTS5 sûre : `terme*` par mot. */
function toFtsQuery(input: string): string | null {
  const terms = input
    .toLowerCase()
    .replace(/["*()]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => `"${t}"*`);
  return terms.length > 0 ? terms.join(' ') : null;
}

export async function searchNotes(db: SQLiteDatabase, query: string): Promise<Note[]> {
  const fts = toFtsQuery(query);
  if (!fts) return listNotes(db);
  try {
    const rows = await db.getAllAsync<NoteRow>(
      `SELECT n.* FROM notes n
         JOIN notes_fts f ON f.rowid = n.rowid
        WHERE notes_fts MATCH ?
        ORDER BY rank`,
      fts,
    );
    return rows.map(mapNote);
  } catch {
    // Repli si la table FTS n'a pas pu être créée.
    const like = `%${query.trim()}%`;
    const rows = await db.getAllAsync<NoteRow>(
      'SELECT * FROM notes WHERE title LIKE ? OR body LIKE ? ORDER BY updated_at DESC',
      like,
      like,
    );
    return rows.map(mapNote);
  }
}

// ── Documents : écriture ───────────────────────────────────────────────────

export interface DocumentInput {
  id: string;
  title: string;
  categoryId?: number | null;
  relPath: string;
  fileType: FileType;
  source: DocumentSource;
  pageCount?: number;
  sizeBytes?: number;
  /** Chemins relatifs des pages (scans multi-pages), dans l'ordre. */
  pages?: string[];
}

/** Insère un document (+ ses pages) dans une transaction. */
export async function insertDocument(db: SQLiteDatabase, input: DocumentInput): Promise<void> {
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO documents
         (id, title, category_id, rel_path, file_type, source, page_count, size_bytes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      input.id,
      input.title,
      input.categoryId ?? null,
      input.relPath,
      input.fileType,
      input.source,
      input.pageCount ?? input.pages?.length ?? 1,
      input.sizeBytes ?? 0,
      now,
      now,
    );
    const pages = input.pages ?? [];
    for (let i = 0; i < pages.length; i++) {
      await db.runAsync(
        'INSERT INTO document_pages (document_id, rel_path, sort_order) VALUES (?, ?, ?)',
        input.id,
        pages[i],
        i,
      );
    }
  });
}

export async function pagesForDocument(
  db: SQLiteDatabase,
  documentId: string,
): Promise<DocumentPage[]> {
  const rows = await db.getAllAsync<DocumentPageRow>(
    'SELECT * FROM document_pages WHERE document_id = ? ORDER BY sort_order',
    documentId,
  );
  return rows.map(mapPage);
}

export async function setDocumentCategory(
  db: SQLiteDatabase,
  id: string,
  categoryId: number | null,
): Promise<void> {
  await db.runAsync(
    'UPDATE documents SET category_id = ?, updated_at = ? WHERE id = ?',
    categoryId,
    Date.now(),
    id,
  );
}

export async function renameDocument(
  db: SQLiteDatabase,
  id: string,
  title: string,
): Promise<void> {
  await db.runAsync(
    'UPDATE documents SET title = ?, updated_at = ? WHERE id = ?',
    title,
    Date.now(),
    id,
  );
}

/** Supprime la ligne document (les pages/tags partent en cascade). */
export async function deleteDocumentRow(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM documents WHERE id = ?', id);
}

// ── Tags ───────────────────────────────────────────────────────────────────

type TagRow = { id: number; name: string };

export async function listTags(db: SQLiteDatabase): Promise<Tag[]> {
  const rows = await db.getAllAsync<TagRow>('SELECT * FROM tags ORDER BY name COLLATE NOCASE');
  return rows.map(mapTag);
}

/** Tags utilisés par au moins un document (pour le filtre bibliothèque). */
export async function listUsedTags(db: SQLiteDatabase): Promise<Tag[]> {
  const rows = await db.getAllAsync<TagRow>(
    `SELECT t.* FROM tags t
      WHERE EXISTS (SELECT 1 FROM document_tags dt WHERE dt.tag_id = t.id)
      ORDER BY t.name COLLATE NOCASE`,
  );
  return rows.map(mapTag);
}

export async function tagsForDocument(db: SQLiteDatabase, documentId: string): Promise<Tag[]> {
  const rows = await db.getAllAsync<TagRow>(
    `SELECT t.* FROM tags t
       JOIN document_tags dt ON dt.tag_id = t.id
      WHERE dt.document_id = ?
      ORDER BY t.name COLLATE NOCASE`,
    documentId,
  );
  return rows.map(mapTag);
}

export async function addTagToDocument(
  db: SQLiteDatabase,
  documentId: string,
  rawName: string,
): Promise<void> {
  const name = rawName.trim();
  if (!name) return;
  await db.withTransactionAsync(async () => {
    await db.runAsync('INSERT OR IGNORE INTO tags (name) VALUES (?)', name);
    const tag = await db.getFirstAsync<TagRow>('SELECT id FROM tags WHERE name = ?', name);
    if (tag) {
      await db.runAsync(
        'INSERT OR IGNORE INTO document_tags (document_id, tag_id) VALUES (?, ?)',
        documentId,
        tag.id,
      );
      await db.runAsync('UPDATE documents SET updated_at = ? WHERE id = ?', Date.now(), documentId);
    }
  });
}

export async function removeTagFromDocument(
  db: SQLiteDatabase,
  documentId: string,
  tagId: number,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'DELETE FROM document_tags WHERE document_id = ? AND tag_id = ?',
      documentId,
      tagId,
    );
    // Purge le tag s'il n'est plus rattaché à rien.
    await db.runAsync(
      'DELETE FROM tags WHERE id = ? AND NOT EXISTS (SELECT 1 FROM document_tags WHERE tag_id = ?)',
      tagId,
      tagId,
    );
  });
}

// ── Catégories : écriture ──────────────────────────────────────────────────

export async function addCategory(
  db: SQLiteDatabase,
  name: string,
  color: string,
  icon = 'pricetag',
): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM categories',
  );
  await db.runAsync(
    'INSERT INTO categories (name, color, icon, sort_order) VALUES (?, ?, ?, ?)',
    trimmed,
    color,
    icon,
    row?.n ?? 0,
  );
}
