import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useQuery } from '@/hooks/use-query';
import { getDocument } from '@/services/db';
import { exportDocument } from '@/services/export';

export default function ExportModal() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const doc = useQuery((d) => getDocument(d, id), [id]);
  const [busy, setBusy] = useState(false);

  if (doc.data === null) {
    return <EmptyState icon="alert-circle-outline" title="Document introuvable" />;
  }
  if (!doc.data) return null;
  const d = doc.data;
  const isScan = d.fileType === 'image';

  async function run() {
    if (busy) return;
    setBusy(true);
    try {
      await exportDocument(db, d);
      router.back();
    } catch (e) {
      Alert.alert('Export impossible', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ThemedText type="small" themeColor="textSecondary">
        {d.title}
      </ThemedText>

      <Pressable
        onPress={run}
        disabled={busy}
        style={[styles.action, { backgroundColor: theme.backgroundElement }]}>
        {busy ? (
          <ActivityIndicator color={theme.accent} />
        ) : (
          <Ionicons
            name={isScan ? 'document-outline' : 'share-outline'}
            size={22}
            color={theme.accent}
          />
        )}
        <View style={styles.flex}>
          <ThemedText>{isScan ? 'Exporter en PDF' : "Partager l'original"}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {isScan
              ? `Assemble ${d.pageCount} page(s) puis ouvre le partage.`
              : 'Ouvre la feuille de partage du système.'}
          </ThemedText>
        </View>
      </Pressable>

      <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
        Le fichier ne quitte l&apos;appareil que via la feuille de partage.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  flex: {
    flex: 1,
    gap: 2,
  },
  note: {
    textAlign: 'center',
  },
});
