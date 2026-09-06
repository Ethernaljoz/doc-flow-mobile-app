import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Loader } from '@/components/loader';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useQuery } from '@/hooks/use-query';
import type { Note } from '@/models/types';
import { deleteNote, searchNotes } from '@/services/db';
import { exportNote } from '@/services/export';
import { formatRelativeDate } from '@/utils/format';
import { haptic } from '@/utils/haptics';

export default function NotesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const [search, setSearch] = useState('');
  const notes = useQuery((d) => searchNotes(d, search.trim()), [search]);
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => {
    setRefreshing(true);
    void notes.refresh().finally(() => setRefreshing(false));
  };

  function rowActions(item: Note) {
    haptic.medium();
    Alert.alert(item.title || 'Note', undefined, [
      {
        text: 'Exporter en PDF',
        onPress: () =>
          exportNote(item, 'pdf').catch((e) => Alert.alert('Export impossible', String(e))),
      },
      {
        text: 'Exporter en texte',
        onPress: () =>
          exportNote(item, 'txt').catch((e) => Alert.alert('Export impossible', String(e))),
      },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Supprimer la note ?', undefined, [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Supprimer',
              style: 'destructive',
              onPress: async () => {
                haptic.warning();
                await deleteNote(db, item.id);
                notes.reload();
              },
            },
          ]),
      },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

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
        refreshing={refreshing}
        onRefresh={onRefresh}
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
            onLongPress={() => rowActions(item)}
            delayLongPress={300}
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
