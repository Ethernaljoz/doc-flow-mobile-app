import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useQuery } from '@/hooks/use-query';
import { addTagToDocument, listTags, tagsForDocument } from '@/services/db';
import { haptic } from '@/utils/haptics';

export default function TagAddModal() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [value, setValue] = useState('');

  const allTags = useQuery((d) => listTags(d), []);
  const current = useQuery((d) => tagsForDocument(d, id), [id]);

  const currentNames = new Set((current.data ?? []).map((t) => t.name.toLowerCase()));
  const suggestions = (allTags.data ?? []).filter((t) => !currentNames.has(t.name.toLowerCase()));

  async function add(name: string) {
    const clean = name.trim();
    if (!clean) return;
    await addTagToDocument(db, id, clean);
    haptic.light();
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.field, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="small" themeColor="textSecondary">
          #
        </ThemedText>
        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder="Nouveau tag"
          placeholderTextColor={theme.textSecondary}
          autoFocus
          autoCapitalize="none"
          onSubmitEditing={() => add(value)}
          style={[styles.input, { color: theme.text }]}
        />
        <Pressable onPress={() => add(value)} disabled={!value.trim()} hitSlop={8}>
          <Ionicons
            name="checkmark"
            size={20}
            color={value.trim() ? theme.accent : theme.textSecondary}
          />
        </Pressable>
      </View>

      {suggestions.length > 0 && (
        <>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
            EXISTANTS
          </ThemedText>
          <View style={styles.wrap}>
            {suggestions.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => add(t.name)}
                style={[styles.chip, { backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="small">#{t.name}</ThemedText>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: Spacing.three, gap: Spacing.three },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    height: 44,
  },
  input: { flex: 1, fontSize: 16 },
  label: { marginTop: Spacing.two },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
  },
});
