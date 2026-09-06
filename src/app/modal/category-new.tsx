import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CategoryPalette, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addCategory } from '@/services/db';

export default function CategoryNewModal() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(CategoryPalette[0]);

  async function create() {
    if (!name.trim()) return;
    await addCategory(db, name, color);
    router.back();
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.field, { backgroundColor: theme.backgroundElement }]}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Nom de la catégorie"
          placeholderTextColor={theme.textSecondary}
          autoFocus
          onSubmitEditing={create}
          style={[styles.input, { color: theme.text }]}
        />
      </View>

      <ThemedText type="smallBold" themeColor="textSecondary">
        COULEUR
      </ThemedText>
      <View style={styles.swatches}>
        {CategoryPalette.map((c) => (
          <Pressable
            key={c}
            onPress={() => setColor(c)}
            style={[
              styles.swatch,
              { backgroundColor: c, borderColor: color === c ? theme.text : 'transparent' },
            ]}>
            {color === c && <Ionicons name="checkmark" size={16} color="#fff" />}
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={create}
        disabled={!name.trim()}
        style={[
          styles.btn,
          { backgroundColor: name.trim() ? theme.accent : theme.backgroundElement },
        ]}>
        <ThemedText themeColor={name.trim() ? 'background' : 'textSecondary'}>Créer</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: Spacing.three, gap: Spacing.three },
  field: {
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    height: 44,
  },
  input: { fontSize: 16 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn: {
    height: 44,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
});
