import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useQuery } from '@/hooks/use-query';
import {
  type DocumentSort,
  listCategories,
  listDocuments,
  listUsedTags,
} from '@/services/db';
import { formatBytes, thumbnailFile } from '@/services/files';

const SORT_LABEL: Record<DocumentSort, string> = {
  recent: 'Récent',
  name: 'Nom',
  size: 'Taille',
};

export default function DocumentsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [tagId, setTagId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<DocumentSort>('recent');

  const categories = useQuery((db) => listCategories(db), []);
  const tags = useQuery((db) => listUsedTags(db), []);
  const documents = useQuery(
    (db) => listDocuments(db, { categoryId, tagId, search: search.trim() || undefined, sort }),
    [categoryId, tagId, search, sort],
  );

  function chooseSort() {
    Alert.alert('Trier par', undefined, [
      ...(['recent', 'name', 'size'] as DocumentSort[]).map((s) => ({
        text: SORT_LABEL[s],
        onPress: () => setSort(s),
      })),
      { text: 'Annuler', style: 'cancel' as const },
    ]);
  }

  return (
    <Screen
      title="Documents"
      headerRight={
        <Pressable onPress={chooseSort} hitSlop={8} style={styles.sortBtn}>
          <Ionicons name="swap-vertical" size={16} color={theme.accent} />
          <ThemedText type="small" themeColor="accent">
            {SORT_LABEL[sort]}
          </ThemedText>
        </Pressable>
      }>
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}>
        <Chip
          label="Tout"
          active={categoryId === null && tagId === null}
          onPress={() => {
            setCategoryId(null);
            setTagId(null);
          }}
        />
        {(categories.data ?? []).map((c) => (
          <Chip
            key={`c${c.id}`}
            label={c.name}
            color={c.color}
            active={categoryId === c.id}
            onPress={() => setCategoryId(categoryId === c.id ? null : c.id)}
          />
        ))}
        {(tags.data ?? []).map((t) => (
          <Chip
            key={`t${t.id}`}
            label={`#${t.name}`}
            active={tagId === t.id}
            onPress={() => setTagId(tagId === t.id ? null : t.id)}
          />
        ))}
      </ScrollView>

      <FlatList
        data={documents.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          documents.loading ? null : (
            <EmptyState
              icon="folder-open-outline"
              title={search || categoryId || tagId ? 'Aucun résultat' : 'Aucun document'}
              hint={
                search || categoryId || tagId
                  ? undefined
                  : 'Numérisez ou importez un fichier pour commencer.'
              }
            />
          )
        }
        renderItem={({ item }) => {
          const thumb = thumbnailFile(item.id);
          return (
            <Pressable
              onPress={() => router.push(`/document/${item.id}`)}
              style={({ pressed }) => [
                styles.row,
                { borderBottomColor: theme.border },
                pressed && { backgroundColor: theme.backgroundElement },
              ]}>
              {thumb.exists ? (
                <Image source={{ uri: thumb.uri }} style={styles.thumb} contentFit="cover" />
              ) : (
                <View style={[styles.thumb, styles.thumbFallback, { backgroundColor: theme.backgroundElement }]}>
                  <Ionicons name="document-text-outline" size={20} color={theme.icon} />
                </View>
              )}
              <View style={styles.rowText}>
                <ThemedText numberOfLines={1}>{item.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.fileType.toUpperCase()} · {item.pageCount} p · {formatBytes(item.sizeBytes)}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </Pressable>
          );
        }}
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
      style={[styles.chip, { backgroundColor: active ? theme.accent : theme.backgroundElement }]}>
      {color != null && <View style={[styles.dot, { backgroundColor: color }]} />}
      <ThemedText type="small" themeColor={active ? 'background' : 'text'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginHorizontal: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    height: 40,
  },
  searchInput: { flex: 1, fontSize: 16 },
  chipsRow: {
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
  dot: { width: 8, height: 8, borderRadius: 4 },
  listContent: { flexGrow: 1, paddingBottom: Spacing.six },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumb: { width: 40, height: 40, borderRadius: 6 },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 2 },
});
