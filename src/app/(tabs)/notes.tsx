import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useQuery } from '@/hooks/use-query';
import { listNotes } from '@/services/db';

export default function NotesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const notes = useQuery((db) => listNotes(db), []);

  return (
    <Screen
      title="Notes"
      headerRight={
        <Pressable onPress={() => router.push('/note/new')} hitSlop={8}>
          <Ionicons name="add" size={26} color={theme.accent} />
        </Pressable>
      }>
      <FlatList
        data={notes.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          notes.loading ? null : (
            <EmptyState
              icon="create-outline"
              title="Aucune note"
              hint="Touchez + pour un mémo rapide ou un compte-rendu d'appel."
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
                {item.body || 'Note vide'}
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
