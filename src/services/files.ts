/**
 * Couche d'accès au système de fichiers (expo-file-system SDK 57, API OO `File` / `Directory` / `Paths`).
 *
 * Règle : la BDD ne stocke que des chemins RELATIFS à la racine `DocFlow/` du
 * répertoire document. On les résout ici, car le conteneur absolu change entre
 * installs et mises à jour d'OS.
 */
import { Directory, File, Paths } from 'expo-file-system';

/** `<Paths.document>/DocFlow` — stockage persistant. */
export const ROOT = new Directory(Paths.document, 'DocFlow');
/** `<Paths.cache>/DocFlow` — dérivés régénérables (miniatures, exports). */
export const CACHE_ROOT = new Directory(Paths.cache, 'DocFlow');

const DOCUMENTS = new Directory(ROOT, 'documents');
const IMPORTS = new Directory(ROOT, 'imports');
const THUMBNAILS = new Directory(CACHE_ROOT, 'thumbnails');
const EXPORTS = new Directory(CACHE_ROOT, 'exports');

function ensureDir(dir: Directory): Directory {
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/** À appeler une fois au démarrage (onInit du SQLiteProvider). Idempotent. */
export function ensureTree(): void {
  [ROOT, CACHE_ROOT, DOCUMENTS, IMPORTS, THUMBNAILS, EXPORTS].forEach(ensureDir);
}

// ── Résolution de chemins ────────────────────────────────────────────────────

/** Fichier persistant à partir d'un chemin relatif à `DocFlow/`. */
export function resolve(relPath: string): File {
  return new File(ROOT, relPath);
}

/** Chemin relatif à `DocFlow/` à partir d'un fichier/dossier. */
export function relFromRoot(entry: File | Directory): string {
  return entry.uri.replace(ROOT.uri, '').replace(/^\/+/, '');
}

/** Dossier d'un document scanné : `documents/<id>/`. */
export function documentDir(id: string): Directory {
  return ensureDir(new Directory(DOCUMENTS, id));
}

/** Dossier d'un fichier importé : `imports/<id>/`. */
export function importDir(id: string): Directory {
  return ensureDir(new Directory(IMPORTS, id));
}

/** Miniature (cache) d'un document. */
export function thumbnailFile(id: string): File {
  return new File(THUMBNAILS, `${id}.jpg`);
}

/** Fichier d'export PDF transitoire (cache). */
export function exportFile(id: string, ext = 'pdf'): File {
  return new File(EXPORTS, `${id}.${ext}`);
}

// ── Opérations ──────────────────────────────────────────────────────────────

/**
 * Copie un fichier choisi via DocumentPicker vers `imports/<id>/<nom>`.
 * Retourne le chemin relatif à `DocFlow/`.
 */
export function importPicked(sourceUri: string, fileName: string, id: string): string {
  const dest = new File(importDir(id), fileName);
  if (dest.exists) dest.delete();
  new File(sourceUri).copy(dest);
  return relFromRoot(dest);
}

export function writeText(relPath: string, text: string): File {
  const file = resolve(relPath);
  if (!file.exists) file.create({ intermediates: true });
  file.write(text);
  return file;
}

export function readText(relPath: string): string {
  return resolve(relPath).textSync();
}

/** Supprime les fichiers d'un document (dossier persistant + miniature). */
export function deleteDocumentFiles(id: string): void {
  const dir = new Directory(DOCUMENTS, id);
  if (dir.exists) dir.delete();
  const imp = new Directory(IMPORTS, id);
  if (imp.exists) imp.delete();
  const thumb = thumbnailFile(id);
  if (thumb.exists) thumb.delete();
}

/** Somme récursive de la taille des fichiers d'un dossier. */
export function dirSizeBytes(dir: Directory): number {
  if (!dir.exists) return 0;
  let total = 0;
  for (const entry of dir.list()) {
    if (entry instanceof Directory) total += dirSizeBytes(entry);
    else total += entry.size ?? 0;
  }
  return total;
}

export interface StorageUsage {
  documentsBytes: number;
  cacheBytes: number;
  totalBytes: number;
}

export function storageUsage(): StorageUsage {
  const documentsBytes = dirSizeBytes(ROOT);
  const cacheBytes = dirSizeBytes(CACHE_ROOT);
  return { documentsBytes, cacheBytes, totalBytes: documentsBytes + cacheBytes };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  const units = ['Ko', 'Mo', 'Go'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}
