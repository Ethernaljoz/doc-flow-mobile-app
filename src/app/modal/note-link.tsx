import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useQuery } from '@/hooks/use-query';
import { listDocuments, setNoteDocument } from '@/services/db';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

export default function NoteLinkModal() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const { noteId } = useLocalSearchParams<{ noteId: string }>();
  const docs = useQuery((d) => listDocuments(d), []);

  async function pick(documentId: string) {
    await setNoteDocument(db, noteId, documentId);
    router.back();
  }

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      data={docs.data ?? []}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        docs.loading ? null : (
          <EmptyState icon="folder-open-outline" title="Aucun document à associer" />
        )
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => pick(item.id)}
          style={({ pressed }) => [
            styles.row,
            { borderBottomColor: theme.border },
            pressed && { backgroundColor: theme.backgroundElement },
          ]}>
          <Ionicons name="document-text-outline" size={20} color={theme.icon} />
          <View style={styles.flex}>
            <ThemedText numberOfLines={1}>{item.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {item.fileType.toUpperCase()} · {item.pageCount} p
            </ThemedText>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  flex: { flex: 1, gap: 2 },
});
