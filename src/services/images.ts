/**
 * Traitement d'image local (expo-image-manipulator SDK 57).
 *
 * NB SDK 57 : `expo-image-manipulator` ne fait que crop / rotate / resize /
 * flip / compress — pas d'opérations couleur. Les filtres N&B / contraste
 * arriveront via `@shopify/react-native-skia` (`ColorMatrix`).
 */
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const PAGE_MAX_WIDTH = 2200;
const PAGE_COMPRESS = 0.7;
const THUMB_MAX_WIDTH = 480;
const THUMB_COMPRESS = 0.6;

export type ScanFilter = 'original' | 'grayscale' | 'bw';

/**
 * Redimensionne + compresse une page numérisée. Retourne l'URI (cache) du JPEG.
 * `filter` est accepté dès maintenant mais seul `original` est appliqué
 * (voir note module).
 */
export async function processPage(uri: string, _filter: ScanFilter = 'original'): Promise<string> {
  const context = ImageManipulator.manipulate(uri).resize({ width: PAGE_MAX_WIDTH });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress: PAGE_COMPRESS, format: SaveFormat.JPEG });
  return result.uri;
}

/** Génère une miniature JPEG et l'écrit dans `dest`. */
export async function makeThumbnail(sourceUri: string, dest: File): Promise<void> {
  const context = ImageManipulator.manipulate(sourceUri).resize({ width: THUMB_MAX_WIDTH });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress: THUMB_COMPRESS, format: SaveFormat.JPEG });
  if (dest.exists) dest.delete();
  new File(result.uri).copySync(dest);
}
