/**
 * Export & partage (expo-print + expo-sharing).
 * - Document scanné (images) → PDF généré à la volée puis partagé.
 * - Fichier importé → partage de l'original.
 */
import { File } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { DocumentRecord, FileType, Note } from '@/models/types';
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

// ── Notes ──────────────────────────────────────────────────────────────────

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });

const noteFileName = (note: Note) =>
  (note.title.trim() || 'note').replace(/[/\\?%*:|"<>]/g, '_').slice(0, 60);

export async function noteToPdf(note: Note): Promise<string> {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { font: 15px/1.6 -apple-system, Roboto, sans-serif; padding: 32px; color: #111; }
    h1 { font-size: 22px; margin: 0 0 16px; }
    pre { white-space: pre-wrap; font: inherit; margin: 0; }
  </style></head><body>
    <h1>${escapeHtml(note.title.trim() || 'Sans titre')}</h1>
    <pre>${escapeHtml(note.body)}</pre>
  </body></html>`;
  const { uri } = await Print.printToFileAsync({ html });
  const dest = exportFile(noteFileName(note), 'pdf');
  if (dest.exists) dest.delete();
  new File(uri).moveSync(dest);
  return dest.uri;
}

export function noteToTxt(note: Note): string {
  const dest = exportFile(noteFileName(note), 'txt');
  if (dest.exists) dest.delete();
  dest.create();
  const header = note.title.trim();
  dest.write(header ? `${header}\n\n${note.body}` : note.body);
  return dest.uri;
}

export async function exportNote(note: Note, format: 'pdf' | 'txt'): Promise<void> {
  const uri = format === 'pdf' ? await noteToPdf(note) : noteToTxt(note);
  await shareFile(uri, format === 'pdf' ? MIME.pdf : MIME.txt);
}
