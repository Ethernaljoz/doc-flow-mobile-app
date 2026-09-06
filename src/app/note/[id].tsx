import * as Crypto from 'expo-crypto';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deleteNote, getNote, upsertNote } from '@/services/db';

export default function NoteEditorScreen() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ id: string; documentId?: string }>();
  const isNew = params.id === 'new';

  const [noteId] = useState(() => (isNew ? Crypto.randomUUID() : params.id));
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loaded, setLoaded] = useState(isNew);

  useEffect(() => {
    if (isNew) return;
    getNote(db, noteId).then((n) => {
      if (n) {
        setTitle(n.title);
        setBody(n.body);
      }
      setLoaded(true);
    });
  }, [db, isNew, noteId]);

  async function save() {
    if (!title.trim() && !body.trim()) {
      router.back();
      return;
    }
    await upsertNote(db, {
      id: noteId,
      title: title.trim(),
      body,
      documentId: params.documentId ?? null,
    });
    router.back();
  }

  function confirmDelete() {
    Alert.alert('Supprimer la note ?', undefined, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteNote(db, noteId);
          router.back();
        },
      },
    ]);
  }

  return (
    <SafeAreaView edges={['bottom']} style={[styles.root, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: isNew ? 'Nouvelle note' : 'Note',
          headerRight: () => (
            <Pressable onPress={save} hitSlop={8}>
              <ThemedText type="link" themeColor="accent">
                OK
              </ThemedText>
            </Pressable>
          ),
        }}
      />
      {loaded && (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Titre"
            placeholderTextColor={theme.textSecondary}
            style={[styles.title, { color: theme.text }]}
          />
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Écrire une note…"
            placeholderTextColor={theme.textSecondary}
            multiline
            style={[styles.body, { color: theme.text }]}
          />
          {!isNew && (
            <Pressable onPress={confirmDelete} style={styles.deleteBtn}>
              <ThemedText type="small" themeColor="danger">
                Supprimer la note
              </ThemedText>
            </Pressable>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.two,
    flexGrow: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    paddingVertical: Spacing.two,
  },
  body: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 240,
    textAlignVertical: 'top',
  },
  deleteBtn: {
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
});
