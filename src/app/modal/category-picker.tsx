import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useQuery } from '@/hooks/use-query';
import { getDocument, listCategories } from '@/services/db';

export default function CategoryPickerModal() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();

  const categories = useQuery((d) => listCategories(d), []);
  const doc = useQuery((d) => getDocument(d, id), [id]);

  async function assign(categoryId: number | null) {
    await db.runAsync(
      'UPDATE documents SET category_id = ?, updated_at = ? WHERE id = ?',
      categoryId,
      Date.now(),
      id,
    );
    router.back();
  }

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Row label="Aucune" selected={doc.data?.categoryId == null} onPress={() => assign(null)} />
      {(categories.data ?? []).map((c) => (
        <Row
          key={c.id}
          label={c.name}
          color={c.color}
          selected={doc.data?.categoryId === c.id}
          onPress={() => assign(c.id)}
        />
      ))}
    </ScrollView>
  );
}

function Row({
  label,
  color,
  selected,
  onPress,
}: {
  label: string;
  color?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.border },
        pressed && { backgroundColor: theme.backgroundElement },
      ]}>
      <View style={[styles.dot, { backgroundColor: color ?? theme.border }]} />
      <ThemedText style={styles.flex}>{label}</ThemedText>
      {selected && <Ionicons name="checkmark" size={18} color={theme.accent} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  flex: {
    flex: 1,
  },
});
