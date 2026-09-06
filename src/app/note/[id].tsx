import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useQuery } from '@/hooks/use-query';
import {
  deleteNote,
  getDocument,
  getNote,
  setNoteDocument,
  upsertNote,
} from '@/services/db';
import { exportNote } from '@/services/export';
import { haptic } from '@/utils/haptics';

const AUTOSAVE_MS = 700;

export default function NoteEditorScreen() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const params = useLocalSearchParams<{ id: string; documentId?: string }>();
  const isNew = params.id === 'new';

  const [noteId] = useState(() => (isNew ? Crypto.randomUUID() : params.id));
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [documentId, setDocumentId] = useState<string | null>(params.documentId ?? null);
  const [loaded, setLoaded] = useState(isNew);

  const linkedDoc = useQuery(
    (d) => (documentId ? getDocument(d, documentId) : Promise.resolve(null)),
    [documentId],
  );

  // Chargement initial
  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    const load = async () => {
      const n = await getNote(db, noteId);
      if (cancelled) return;
      if (n) {
        setTitle(n.title);
        setBody(n.body);
        setDocumentId(n.documentId);
      }
      setLoaded(true);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [db, isNew, noteId]);

  // Re-synchronise le lien document au retour de la modale d'association
  useFocusEffect(
    useCallback(() => {
      if (!loaded) return;
      let cancelled = false;
      getNote(db, noteId).then((n) => {
        if (!cancelled && n) setDocumentId(n.documentId);
      });
      return () => {
        cancelled = true;
      };
    }, [db, noteId, loaded]),
  );

  // Autosave débouncé + flush à la sortie
  const latest = useRef({ title, body, documentId });
  useEffect(() => {
    latest.current = { title, body, documentId };
  });
  const persisted = useRef(!isNew);
  const abandoned = useRef(false);

  const persist = useCallback(async () => {
    if (abandoned.current) return;
    const { title: t, body: b, documentId: docId } = latest.current;
    if (!persisted.current && !t.trim() && !b.trim()) return;
    persisted.current = true;
    await upsertNote(db, { id: noteId, title: t.trim(), body: b, documentId: docId });
  }, [db, noteId]);

  useEffect(() => {
    if (!loaded) return;
    const handle = setTimeout(() => {
      void persist();
    }, AUTOSAVE_MS);
    return () => clearTimeout(handle);
  }, [title, body, documentId, loaded, persist]);

  useEffect(() => () => void persist(), [persist]);

  async function ensureSaved() {
    persisted.current = true;
    await upsertNote(db, {
      id: noteId,
      title: title.trim(),
      body,
      documentId,
    });
  }

  function onExport() {
    Alert.alert('Exporter la note', undefined, [
      {
        text: 'PDF',
        onPress: () =>
          exportNote({ id: noteId, title, body, documentId, createdAt: 0, updatedAt: 0 }, 'pdf').catch(
            (e) => Alert.alert('Export impossible', String(e)),
          ),
      },
      {
        text: 'Texte (.txt)',
        onPress: () =>
          exportNote({ id: noteId, title, body, documentId, createdAt: 0, updatedAt: 0 }, 'txt').catch(
            (e) => Alert.alert('Export impossible', String(e)),
          ),
      },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }

  async function onLink() {
    await ensureSaved();
    router.push(`/modal/note-link?noteId=${noteId}`);
  }

  async function onUnlink() {
    await setNoteDocument(db, noteId, null);
    setDocumentId(null);
  }

  function confirmDelete() {
    Alert.alert('Supprimer la note ?', undefined, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          abandoned.current = true; // empêche le flush unmount de recréer la note
          haptic.warning();
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
            <Pressable onPress={onExport} hitSlop={8}>
              <Ionicons name="share-outline" size={22} color={theme.accent} />
            </Pressable>
          ),
        }}
      />
      {loaded && (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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

          <View style={[styles.linkRow, { borderColor: theme.border }]}>
            <Ionicons name="link-outline" size={16} color={theme.textSecondary} />
            {documentId && linkedDoc.data ? (
              <>
                <ThemedText
                  type="small"
                  style={styles.flex}
                  numberOfLines={1}
                  onPress={() => router.push(`/document/${documentId}`)}>
                  {linkedDoc.data.title}
                </ThemedText>
                <Pressable onPress={onUnlink} hitSlop={8}>
                  <ThemedText type="small" themeColor="danger">
                    Détacher
                  </ThemedText>
                </Pressable>
              </>
            ) : (
              <ThemedText type="small" themeColor="accent" style={styles.flex} onPress={onLink}>
                Associer à un document
              </ThemedText>
            )}
          </View>

          {!isNew && (
            <Pressable onPress={confirmDelete} style={styles.deleteBtn}>
              <ThemedText type="small" themeColor="danger">
                Supprimer la note
              </ThemedText>
            </Pressable>
          )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.two, flexGrow: 1 },
  title: { fontSize: 22, fontWeight: '600', paddingVertical: Spacing.two },
  body: { fontSize: 16, lineHeight: 24, minHeight: 200, textAlignVertical: 'top' },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.three,
    marginTop: Spacing.two,
  },
  flex: { flex: 1 },
  deleteBtn: { paddingVertical: Spacing.four, alignItems: 'center' },
});
