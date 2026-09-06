import { EmptyState } from '@/components/empty-state';

/**
 * Feuille d'export. Phase 4 : « Exporter en PDF » (groupe les pages via
 * expo-print), « Partager l'original », « Enregistrer dans Fichiers » —
 * tout passe par `Sharing.shareAsync`.
 */
export default function ExportModal() {
  return (
    <EmptyState
      icon="share-outline"
      title="Export"
      hint="Les options de partage arrivent en Phase 4."
    />
  );
}
