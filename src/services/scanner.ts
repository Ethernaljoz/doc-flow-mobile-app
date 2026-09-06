/**
 * Enveloppe autour de `react-native-document-scanner-plugin` (détection des
 * bords + correction de perspective + N&B natifs).
 *
 * Le module natif n'existe pas dans Expo Go ni tant que le dev build n'a pas
 * été régénéré. On sonde d'abord le registre TurboModule (`get`, qui renvoie
 * `null` au lieu de lever) : sans le binaire natif, on ne charge jamais le
 * wrapper JS (dont l'import exécute un `getEnforcing` qui lève). L'appelant
 * bascule alors sur la capture `expo-camera`.
 */
import { Platform, TurboModuleRegistry } from 'react-native';

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

/** Nom d'enregistrement du TurboModule (cf. NativeDocumentScanner.ts du plugin). */
const NATIVE_MODULE_NAME = 'DocumentScanner';

let cached: NativeScanner | null | undefined;

function loadNativeScanner(): NativeScanner | null {
  if (cached !== undefined) return cached;

  if (Platform.OS === 'web' || TurboModuleRegistry.get(NATIVE_MODULE_NAME) == null) {
    cached = null;
    return cached;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-document-scanner-plugin') as
      | { default?: NativeScanner }
      | NativeScanner;
    const scanner = 'default' in mod && mod.default ? mod.default : (mod as NativeScanner);
    cached = typeof scanner?.scanDocument === 'function' ? scanner : null;
  } catch {
    cached = null;
  }
  return cached;
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
