import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Loader } from '@/components/loader';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useQuery } from '@/hooks/use-query';
import { searchNotes } from '@/services/db';
import { formatRelativeDate } from '@/utils/format';

export default function NotesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const notes = useQuery((db) => searchNotes(db, search.trim()), [search]);

  return (
    <Screen
      title="Notes"
      headerRight={
        <Pressable onPress={() => router.push('/note/new')} hitSlop={8}>
          <Ionicons name="add" size={26} color={theme.accent} />
        </Pressable>
      }>
      <View style={[styles.searchBar, { backgroundColor: theme.backgroundElement }]}>
        <Ionicons name="search" size={16} color={theme.textSecondary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher (titre, contenu)"
          placeholderTextColor={theme.textSecondary}
          style={[styles.searchInput, { color: theme.text }]}
        />
      </View>

      <FlatList
        data={notes.data ?? []}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          notes.loading && !notes.data ? (
            <Loader />
          ) : (
            <EmptyState
              icon="create-outline"
              title={search ? 'Aucun résultat' : 'Aucune note'}
              hint={
                search
                  ? undefined
                  : "Touchez + pour un mémo rapide ou un compte-rendu d'appel."
              }
            />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/note/${item.id}`)}
            style={({ pressed }) => [
              styles.row,
              { borderBottomColor: theme.border },
              pressed && { backgroundColor: theme.backgroundElement },
            ]}>
            <View style={styles.rowText}>
              <ThemedText numberOfLines={1}>{item.title || 'Sans titre'}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {formatRelativeDate(item.updatedAt)} · {item.body || 'Note vide'}
              </ThemedText>
            </View>
            {item.documentId != null && (
              <Ionicons name="link-outline" size={16} color={theme.textSecondary} />
            )}
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    height: 40,
  },
  searchInput: { flex: 1, fontSize: 16 },
  list: { flex: 1 },
  listContent: { flexGrow: 1, paddingBottom: Spacing.six },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, gap: 2 },
});
