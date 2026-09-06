/**
 * Enveloppe autour de `react-native-document-scanner-plugin` (détection des
 * bords + correction de perspective + N&B natifs).
 *
 * Le module natif n'existe pas dans Expo Go ni avant un dev build : on le
 * charge en `require` paresseux et on renvoie `unavailable` plutôt que de
 * planter. L'appelant bascule alors sur la capture `expo-camera`.
 */
import { Platform } from 'react-native';

export type ScannerStatus = 'success' | 'cancel' | 'unavailable';

export interface ScanResult {
  status: ScannerStatus;
  /** URIs `file://` des images recadrées (une par page). */
  images: string[];
}

interface NativeScanner {
  scanDocument: (options: {
    croppedImageQuality?: number;
    maxNumDocuments?: number;
    responseType?: 'base64' | 'imageFilePath';
  }) => Promise<{ scannedImages?: string[]; status?: 'success' | 'cancel' }>;
}

function loadNativeScanner(): NativeScanner | null {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-document-scanner-plugin') as
      | { default?: NativeScanner }
      | NativeScanner;
    const scanner = 'default' in mod && mod.default ? mod.default : (mod as NativeScanner);
    return typeof scanner?.scanDocument === 'function' ? scanner : null;
  } catch {
    return null;
  }
}

export async function scanDocuments(maxPages?: number): Promise<ScanResult> {
  const scanner = loadNativeScanner();
  if (!scanner) return { status: 'unavailable', images: [] };

  try {
    const res = await scanner.scanDocument({
      croppedImageQuality: 80,
      responseType: 'imageFilePath',
      ...(maxPages ? { maxNumDocuments: maxPages } : {}),
    });
    const images = res.scannedImages ?? [];
    if (res.status === 'success' && images.length > 0) {
      return { status: 'success', images };
    }
    return { status: 'cancel', images: [] };
  } catch {
    return { status: 'unavailable', images: [] };
  }
}
