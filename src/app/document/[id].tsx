import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useQuery } from '@/hooks/use-query';
import { getDocument, notesForDocument } from '@/services/db';
import { formatBytes } from '@/services/files';

export default function DocumentDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const doc = useQuery((db) => getDocument(db, id), [id]);
  const notes = useQuery((db) => notesForDocument(db, id), [id]);

  if (doc.data === null) {
    return <EmptyState icon="alert-circle-outline" title="Document introuvable" />;
  }
  if (!doc.data) return null;

  const d = doc.data;

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <ThemedText type="subtitle">{d.title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {d.fileType.toUpperCase()} · {d.pageCount} page(s) · {formatBytes(d.sizeBytes)} · {d.source}
      </ThemedText>

      <View style={[styles.actions, { borderColor: theme.border }]}>
        <Action icon="eye-outline" label="Lire" onPress={() => router.push(`/viewer/${d.id}`)} />
        <Action icon="share-outline" label="Exporter" onPress={() => router.push(`/modal/export?id=${d.id}`)} />
        <Action
          icon="pricetag-outline"
          label="Catégorie"
          onPress={() => router.push(`/modal/category-picker?id=${d.id}`)}
        />
      </View>

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
        NOTES LIÉES
      </ThemedText>
      {(notes.data ?? []).length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Aucune note associée.
        </ThemedText>
      ) : (
        (notes.data ?? []).map((n) => (
          <ThemedText key={n.id} type="small" onPress={() => router.push(`/note/${n.id}`)}>
            • {n.title || 'Sans titre'}
          </ThemedText>
        ))
      )}
      <ThemedText
        type="link"
        themeColor="accent"
        onPress={() => router.push(`/note/new?documentId=${d.id}`)}>
        + Associer une note
      </ThemedText>
    </ScrollView>
  );
}

function Action({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.action}>
      <Ionicons name={icon} size={22} color={theme.accent} onPress={onPress} />
      <ThemedText type="small" onPress={onPress}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.three,
    marginVertical: Spacing.three,
  },
  action: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  sectionTitle: {
    marginTop: Spacing.three,
  },
});
