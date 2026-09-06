import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createScannedDocument } from '@/services/documents';
import type { ScanFilter } from '@/services/images';
import { scanBuffer } from '@/services/scan-buffer';

const FILTERS: { key: ScanFilter; label: string }[] = [
  { key: 'original', label: 'Original' },
  { key: 'grayscale', label: 'Gris' },
  { key: 'bw', label: 'N&B' },
];

export default function ScanReviewScreen() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();

  const [pages, setPages] = useState<string[]>(() => scanBuffer.get());
  const [title, setTitle] = useState('');
  const [filter, setFilter] = useState<ScanFilter>('original');
  const [saving, setSaving] = useState(false);

  function removeAt(index: number) {
    setPages((p) => p.filter((_, i) => i !== index));
  }

  function move(index: number, dir: -1 | 1) {
    setPages((p) => {
      const next = [...p];
      const target = index + dir;
      if (target < 0 || target >= next.length) return p;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function save() {
    if (saving || pages.length === 0) return;
    setSaving(true);
    try {
      const id = await createScannedDocument(db, {
        pageUris: pages,
        title,
        filter,
      });
      scanBuffer.clear();
      router.replace(`/document/${id}`);
    } catch (e) {
      setSaving(false);
      Alert.alert('Enregistrement impossible', e instanceof Error ? e.message : String(e));
    }
  }

  if (pages.length === 0) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: 'Revue du scan' }} />
        <EmptyState icon="scan-outline" title="Aucune page" hint="Revenez pour numériser." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} style={[styles.root, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: 'Revue du scan',
          headerRight: () => (
            <Pressable onPress={save} hitSlop={8} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={theme.accent} />
              ) : (
                <ThemedText type="link" themeColor="accent">
                  Enregistrer
                </ThemedText>
              )}
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Titre du document"
          placeholderTextColor={theme.textSecondary}
          style={[styles.title, { color: theme.text, borderBottomColor: theme.border }]}
        />

        <View style={styles.segment}>
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[
                styles.segmentItem,
                { backgroundColor: filter === f.key ? theme.accent : theme.backgroundElement },
              ]}>
              <ThemedText type="small" themeColor={filter === f.key ? 'background' : 'text'}>
                {f.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        {filter !== 'original' && (
          <ThemedText type="small" themeColor="textSecondary">
            Les filtres couleur arrivent bientôt — la page sera enregistrée en l&apos;état.
          </ThemedText>
        )}

        {pages.map((uri, index) => (
          <View key={`${uri}-${index}`} style={[styles.pageCard, { borderColor: theme.border }]}>
            <Image source={{ uri }} style={styles.pagePreview} contentFit="contain" />
            <View style={styles.pageActions}>
              <ThemedText type="small" themeColor="textSecondary">
                Page {index + 1}
              </ThemedText>
              <View style={styles.pageButtons}>
                <PageBtn icon="arrow-up" onPress={() => move(index, -1)} />
                <PageBtn icon="arrow-down" onPress={() => move(index, 1)} />
                <PageBtn icon="trash-outline" onPress={() => removeAt(index)} danger />
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function PageBtn({
  icon,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  danger?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={6} style={styles.pageBtn}>
      <Ionicons name={icon} size={18} color={danger ? theme.danger : theme.icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  segment: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  pageCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.three,
    overflow: 'hidden',
  },
  pagePreview: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#00000010',
  },
  pageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.two,
  },
  pageButtons: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  pageBtn: {
    padding: Spacing.one,
  },
});
