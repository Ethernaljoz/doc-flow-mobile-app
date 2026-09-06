import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { Loader } from '@/components/loader';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useQuery } from '@/hooks/use-query';
import {
  getDocument,
  listCategories,
  notesForDocument,
  removeTagFromDocument,
  renameDocument,
  tagsForDocument,
} from '@/services/db';
import { removeDocument } from '@/services/documents';
import { formatBytes, thumbnailFile } from '@/services/files';
import { haptic } from '@/utils/haptics';

export default function DocumentDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();

  const doc = useQuery((d) => getDocument(d, id), [id]);
  const notes = useQuery((d) => notesForDocument(d, id), [id]);
  const tags = useQuery((d) => tagsForDocument(d, id), [id]);
  const categories = useQuery((d) => listCategories(d), []);

  const [title, setTitle] = useState('');
  const seeded = useRef(false);
  useEffect(() => {
    if (!seeded.current && doc.data) {
      setTitle(doc.data.title);
      seeded.current = true;
    }
  }, [doc.data]);

  useEffect(() => {
    if (!seeded.current) return;
    const t = title.trim();
    if (!t || t === doc.data?.title) return;
    const handle = setTimeout(() => {
      void renameDocument(db, id, t);
    }, 600);
    return () => clearTimeout(handle);
  }, [title, db, id, doc.data?.title]);

  if (doc.error) {
    return <EmptyState icon="warning-outline" title="Erreur" hint={doc.error.message} />;
  }
  if (doc.data === null) {
    return <EmptyState icon="alert-circle-outline" title="Document introuvable" />;
  }
  if (!doc.data) return <Loader />;
  const d = doc.data;
  const thumb = thumbnailFile(d.id);
  const category = (categories.data ?? []).find((c) => c.id === d.categoryId) ?? null;

  function confirmDelete() {
    Alert.alert('Supprimer ce document ?', 'Cette action est définitive.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          haptic.warning();
          await removeDocument(db, id);
          router.back();
        },
      },
    ]);
  }

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: title || d.title }} />

      {thumb.exists && (
        <Image
          source={{ uri: thumb.uri }}
          style={[styles.hero, { backgroundColor: theme.backgroundElement }]}
          contentFit="contain"
        />
      )}

      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Titre du document"
        placeholderTextColor={theme.textSecondary}
        selectTextOnFocus
        style={[styles.title, { color: theme.text }]}
        accessibilityLabel="Titre du document, modifiable"
      />
      <ThemedText type="small" themeColor="textSecondary">
        {d.fileType.toUpperCase()} · {d.pageCount} page(s) · {formatBytes(d.sizeBytes)} ·{' '}
        {d.source === 'scan' ? 'numérisé' : 'importé'}
      </ThemedText>

      <View style={[styles.actions, { borderColor: theme.border }]}>
        <Action icon="eye-outline" label="Lire" onPress={() => router.push(`/viewer/${d.id}`)} />
        <Action
          icon="share-outline"
          label="Exporter"
          onPress={() => router.push(`/modal/export?id=${d.id}`)}
        />
      </View>

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
        CATÉGORIE
      </ThemedText>
      <Pressable
        onPress={() => router.push(`/modal/category-picker?id=${d.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`Catégorie : ${category ? category.name : 'aucune'}. Modifier.`}
        style={({ pressed }) => [
          styles.categoryChip,
          { backgroundColor: theme.backgroundElement },
          pressed && { opacity: 0.6 },
        ]}>
        {category && <View style={[styles.dot, { backgroundColor: category.color }]} />}
        <ThemedText type="small" themeColor={category ? 'text' : 'textSecondary'}>
          {category ? category.name : 'Aucune catégorie'}
        </ThemedText>
        <Ionicons name="chevron-forward" size={14} color={theme.textSecondary} />
      </Pressable>

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
        TAGS
      </ThemedText>
      <View style={styles.tagsWrap}>
        {(tags.data ?? []).map((t) => (
          <Pressable
            key={t.id}
            onPress={() => removeTagFromDocument(db, id, t.id).then(tags.reload)}
            accessibilityRole="button"
            accessibilityLabel={`Retirer le tag ${t.name}`}
            style={[styles.tag, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small">#{t.name}</ThemedText>
            <Ionicons name="close" size={13} color={theme.textSecondary} />
          </Pressable>
        ))}
        <Pressable
          onPress={() => router.push(`/modal/tag-add?id=${d.id}`)}
          style={[styles.tag, { borderColor: theme.border, borderWidth: StyleSheet.hairlineWidth }]}>
          <Ionicons name="add" size={14} color={theme.accent} />
          <ThemedText type="small" themeColor="accent">
            Ajouter
          </ThemedText>
        </Pressable>
      </View>

      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
        NOTES LIÉES
      </ThemedText>
      {(notes.data ?? []).length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          Aucune note associée.
        </ThemedText>
      ) : (
        (notes.data ?? []).map((n) => (
          <ThemedText key={n.id} type="small" onPress={() => router.push(`/note/${n.id}`)}>
            • {n.title || 'Sans titre'}
          </ThemedText>
        ))
      )}
      <ThemedText
        type="link"
        themeColor="accent"
        onPress={() => router.push(`/note/new?documentId=${d.id}`)}>
        + Associer une note
      </ThemedText>

      <Pressable onPress={confirmDelete} style={styles.deleteBtn}>
        <ThemedText type="small" themeColor="danger">
          Supprimer le document
        </ThemedText>
      </Pressable>
    </ScrollView>
  );
}

function Action({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.action}>
      <Ionicons name={icon} size={22} color={theme.accent} />
      <ThemedText type="small">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.two },
  hero: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: Spacing.three,
    marginBottom: Spacing.two,
  },
  title: { fontSize: 24, fontWeight: '600', paddingVertical: Spacing.one },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.three,
    marginVertical: Spacing.three,
  },
  action: { alignItems: 'center', gap: Spacing.one },
  sectionTitle: { marginTop: Spacing.three },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
  },
  deleteBtn: { paddingVertical: Spacing.four, alignItems: 'center' },
});
