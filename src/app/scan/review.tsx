import { EmptyState } from '@/components/empty-state';

/**
 * Revue post-numérisation. Phase 1 : réordonner / supprimer les pages,
 * bascule de filtre (Original / N&B / Niveaux de gris), compression, puis
 * enregistrement en document multi-pages.
 */
export default function ScanReviewScreen() {
  return (
    <EmptyState
      icon="scan-outline"
      title="Revue du scan"
      hint="Recadrage, filtres et enregistrement arrivent en Phase 1."
    />
  );
}
