/**
 * Types du domaine DocFlow.
 * Les colonnes SQLite en snake_case sont mappées en camelCase par les services.
 */

export type FileType = 'pdf' | 'image' | 'docx' | 'xlsx' | 'pptx' | 'txt';
export type DocumentSource = 'scan' | 'import';

export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
}

export interface Tag {
  id: number;
  name: string;
}

export interface DocumentPage {
  id: number;
  documentId: string;
  /** Chemin relatif à `<Paths.document>/DocFlow/`. */
  relPath: string;
  sortOrder: number;
}

export interface DocumentRecord {
  id: string;
  title: string;
  categoryId: number | null;
  /** Chemin relatif à `<Paths.document>/DocFlow/`. */
  relPath: string;
  fileType: FileType;
  source: DocumentSource;
  pageCount: number;
  sizeBytes: number;
  createdAt: number;
  updatedAt: number;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  documentId: string | null;
  createdAt: number;
  updatedAt: number;
}

/** Types de fichiers acceptés à l'import, par extension. */
export const EXTENSION_TO_FILE_TYPE: Record<string, FileType> = {
  pdf: 'pdf',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  heic: 'image',
  webp: 'image',
  docx: 'docx',
  xlsx: 'xlsx',
  pptx: 'pptx',
  txt: 'txt',
  md: 'txt',
};

export function fileTypeFromName(name: string): FileType | null {
  const ext = name.split('.').pop()?.toLowerCase();
  if (!ext) return null;
  return EXTENSION_TO_FILE_TYPE[ext] ?? null;
}
