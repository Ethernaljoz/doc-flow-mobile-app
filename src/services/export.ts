/**
 * Export & partage (expo-print + expo-sharing).
 * - Document scanné (images) → PDF généré à la volée puis partagé.
 * - Fichier importé → partage de l'original.
 */
import { File } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { DocumentRecord, FileType } from '@/models/types';
import { pagesForDocument } from '@/services/db';
import { exportFile, resolve } from '@/services/files';

const MIME: Record<FileType, string> = {
  pdf: 'application/pdf',
  image: 'image/jpeg',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
};

export async function shareFile(uri: string, mimeType?: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Le partage n'est pas disponible sur cet appareil.");
  }
  await Sharing.shareAsync(uri, mimeType ? { mimeType } : undefined);
}

/** Assemble les pages image d'un document scanné en un PDF. Retourne l'URI. */
export async function buildDocumentPdf(
  db: SQLiteDatabase,
  doc: DocumentRecord,
): Promise<string> {
  const pages = await pagesForDocument(db, doc.id);
  const relPaths = pages.length > 0 ? pages.map((p) => p.relPath) : [doc.relPath];

  const imgs = relPaths
    .map((rel) => {
      const b64 = resolve(rel).base64Sync();
      return `<img src="data:image/jpeg;base64,${b64}" />`;
    })
    .join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { margin: 0; }
    html, body { margin: 0; padding: 0; }
    img { display: block; width: 100%; page-break-after: always; }
    img:last-child { page-break-after: auto; }
  </style></head><body>${imgs}</body></html>`;

  const { uri } = await Print.printToFileAsync({ html });
  const dest = exportFile(doc.id, 'pdf');
  if (dest.exists) dest.delete();
  new File(uri).moveSync(dest);
  return dest.uri;
}

/** Action d'export par défaut : PDF pour un scan, original sinon. */
export async function exportDocument(db: SQLiteDatabase, doc: DocumentRecord): Promise<void> {
  if (doc.fileType === 'image') {
    const pdfUri = await buildDocumentPdf(db, doc);
    await shareFile(pdfUri, MIME.pdf);
  } else {
    await shareFile(resolve(doc.relPath).uri, MIME[doc.fileType]);
  }
}
