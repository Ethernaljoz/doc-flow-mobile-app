import { useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/components/empty-state';
import { useQuery } from '@/hooks/use-query';
import { getDocument } from '@/services/db';

/**
 * Hub de lecture universel. Phase 2 : aiguillage selon `fileType`
 * (image → expo-image, txt → ScrollView, pdf → react-native-pdf,
 *  docx → mammoth+WebView, xlsx → SheetJS+WebView).
 */
export default function ViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const doc = useQuery((db) => getDocument(db, id), [id]);

  if (!doc.data) {
    return <EmptyState icon="document-outline" title="Chargement…" />;
  }

  return (
    <EmptyState
      icon="eye-outline"
      title={`Lecteur ${doc.data.fileType.toUpperCase()}`}
      hint="Le rendu multi-format arrive en Phase 2."
    />
  );
}
