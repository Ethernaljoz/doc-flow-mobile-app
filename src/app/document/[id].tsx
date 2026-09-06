import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useQuery } from '@/hooks/use-query';
import { getDocument, notesForDocument } from '@/services/db';
import { removeDocument } from '@/services/documents';
import { formatBytes, thumbnailFile } from '@/services/files';

export default function DocumentDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();

  const doc = useQuery((d) => getDocument(d, id), [id]);
  const notes = useQuery((d) => notesForDocument(d, id), [id]);

  if (doc.data === null) {
    return <EmptyState icon="alert-circle-outline" title="Document introuvable" />;
  }
  if (!doc.data) return null;
  const d = doc.data;
  const thumb = thumbnailFile(d.id);

  function confirmDelete() {
    Alert.alert('Supprimer ce document ?', 'Cette action est définitive.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await removeDocument(db, id);
          router.back();
        },
      },
    ]);
  }

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: d.title }} />

      {thumb.exists && (
        <Image
          source={{ uri: thumb.uri }}
          style={[styles.hero, { backgroundColor: theme.backgroundElement }]}
          contentFit="contain"
        />
      )}

      <ThemedText type="subtitle">{d.title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {d.fileType.toUpperCase()} · {d.pageCount} page(s) · {formatBytes(d.sizeBytes)} ·{' '}
        {d.source === 'scan' ? 'numérisé' : 'importé'}
      </ThemedText>

      <View style={[styles.actions, { borderColor: theme.border }]}>
        <Action icon="eye-outline" label="Lire" onPress={() => router.push(`/viewer/${d.id}`)} />
        <Action
          icon="share-outline"
          label="Exporter"
          onPress={() => router.push(`/modal/export?id=${d.id}`)}
        />
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

      <Pressable onPress={confirmDelete} style={styles.deleteBtn}>
        <ThemedText type="small" themeColor="danger">
          Supprimer le document
        </ThemedText>
      </Pressable>
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
    <Pressable onPress={onPress} style={styles.action}>
      <Ionicons name={icon} size={22} color={theme.accent} />
      <ThemedText type="small">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  hero: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: Spacing.three,
    marginBottom: Spacing.two,
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
  deleteBtn: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
});
