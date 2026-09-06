/**
 * Orchestration de la création / suppression de documents :
 * import via DocumentPicker, enregistrement d'un scan multi-pages, purge des
 * fichiers associés.
 */
import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';

import { fileTypeFromName } from '@/models/types';
import { deleteDocumentRow, insertDocument } from '@/services/db';
import {
  deleteDocumentFiles,
  documentDir,
  importPicked,
  relFromRoot,
  resolve,
  thumbnailFile,
} from '@/services/files';
import { makeThumbnail, processPage, type ScanFilter } from '@/services/images';

export interface PickedAsset {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
}

const baseName = (name: string) => name.replace(/\.[^.]+$/, '').trim() || 'Document';
const safeName = (name: string) => name.replace(/[/\\]/g, '_');

/** Copie un fichier choisi dans l'app et crée sa fiche. Retourne l'id. */
export async function importDocument(db: SQLiteDatabase, asset: PickedAsset): Promise<string> {
  const fileType = fileTypeFromName(asset.name);
  if (!fileType) {
    throw new Error('Type de fichier non pris en charge.');
  }

  const id = Crypto.randomUUID();
  const relPath = importPicked(asset.uri, safeName(asset.name), id);
  const file = resolve(relPath);
  const sizeBytes = file.size ?? asset.size ?? 0;

  if (fileType === 'image') {
    try {
      await makeThumbnail(file.uri, thumbnailFile(id));
    } catch {
      // miniature best-effort
    }
  }

  await insertDocument(db, {
    id,
    title: baseName(asset.name),
    relPath,
    fileType,
    source: 'import',
    pageCount: 1,
    sizeBytes,
  });

  return id;
}

export interface CreateScanInput {
  pageUris: string[];
  title: string;
  categoryId?: number | null;
  filter?: ScanFilter;
}

/** Traite les pages capturées, les range dans `documents/<id>/` et crée la fiche. */
export async function createScannedDocument(
  db: SQLiteDatabase,
  input: CreateScanInput,
): Promise<string> {
  const id = Crypto.randomUUID();
  const dir = documentDir(id);
  const relPaths: string[] = [];
  let sizeBytes = 0;

  for (let i = 0; i < input.pageUris.length; i++) {
    const processedUri = await processPage(input.pageUris[i], input.filter ?? 'original');
    const dest = new File(dir, `page-${String(i + 1).padStart(2, '0')}.jpg`);
    if (dest.exists) dest.delete();
    new File(processedUri).copySync(dest);
    sizeBytes += dest.size ?? 0;
    relPaths.push(relFromRoot(dest));
  }

  if (relPaths.length > 0) {
    try {
      await makeThumbnail(resolve(relPaths[0]).uri, thumbnailFile(id));
    } catch {
      // miniature best-effort
    }
  }

  await insertDocument(db, {
    id,
    title: input.title.trim() || 'Scan',
    categoryId: input.categoryId ?? null,
    relPath: relPaths[0] ?? '',
    fileType: 'image',
    source: 'scan',
    pageCount: relPaths.length,
    sizeBytes,
    pages: relPaths,
  });

  return id;
}

/** Supprime la fiche et tous les fichiers du document. */
export async function removeDocument(db: SQLiteDatabase, id: string): Promise<void> {
  await deleteDocumentRow(db, id);
  deleteDocumentFiles(id);
}
