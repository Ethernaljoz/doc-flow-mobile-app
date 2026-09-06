import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useQuery } from '@/hooks/use-query';
import { listCategories, listDocuments } from '@/services/db';
import { formatBytes } from '@/services/files';

export default function DocumentsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const categories = useQuery((db) => listCategories(db), []);
  const documents = useQuery(
    (db) => listDocuments(db, { categoryId, search: search.trim() || undefined }),
    [categoryId, search],
  );

  return (
    <Screen title="Documents">
      <View style={[styles.searchBar, { backgroundColor: theme.backgroundElement }]}>
        <Ionicons name="search" size={16} color={theme.textSecondary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher"
          placeholderTextColor={theme.textSecondary}
          style={[styles.searchInput, { color: theme.text }]}
        />
      </View>

      <View style={styles.chipsRow}>
        <Chip label="Tout" active={categoryId === null} onPress={() => setCategoryId(null)} />
        {(categories.data ?? []).map((c) => (
          <Chip
            key={c.id}
            label={c.name}
            color={c.color}
            active={categoryId === c.id}
            onPress={() => setCategoryId(c.id)}
          />
        ))}
      </View>

      <FlatList
        data={documents.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          documents.loading ? null : (
            <EmptyState
              icon="folder-open-outline"
              title="Aucun document"
              hint="Numérisez ou importez un fichier pour commencer."
            />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/document/${item.id}`)}
            style={({ pressed }) => [
              styles.row,
              { borderBottomColor: theme.border },
              pressed && { backgroundColor: theme.backgroundElement },
            ]}>
            <Ionicons name="document-text-outline" size={22} color={theme.icon} />
            <View style={styles.rowText}>
              <ThemedText numberOfLines={1}>{item.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.fileType.toUpperCase()} · {item.pageCount} p · {formatBytes(item.sizeBytes)}
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </Pressable>
        )}
      />
    </Screen>
  );
}

function Chip({
  label,
  color,
  active,
  onPress,
}: {
  label: string;
  color?: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: active ? theme.accent : theme.backgroundElement },
      ]}>
      {color != null && <View style={[styles.dot, { backgroundColor: color }]} />}
      <ThemedText type="small" themeColor={active ? 'background' : 'text'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginHorizontal: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: Spacing.six,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
});
