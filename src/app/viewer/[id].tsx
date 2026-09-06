import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { TextViewer } from '@/components/viewers/text-viewer';
import { ViewerBoundary } from '@/components/viewers/viewer-error';
import { WebDocViewer } from '@/components/viewers/web-doc-viewer';
import { ZoomableImage } from '@/components/viewers/zoomable-image';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useQuery } from '@/hooks/use-query';
import type { DocumentRecord } from '@/models/types';
import { getDocument, pagesForDocument } from '@/services/db';
import { exportDocument } from '@/services/export';
import { resolve } from '@/services/files';
import type { WebDocKind } from '@/services/viewer-html';

const MAX_INLINE_BYTES = 15 * 1024 * 1024;

export default function ViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const doc = useQuery((db) => getDocument(db, id), [id]);

  if (doc.data === null) {
    return <EmptyState icon="alert-circle-outline" title="Document introuvable" />;
  }
  if (!doc.data) {
    return <EmptyState icon="document-outline" title="Chargement…" />;
  }

  return (
    <>
      <Stack.Screen options={{ title: doc.data.title }} />
      <ViewerBoundary>
        <ViewerBody doc={doc.data} />
      </ViewerBoundary>
    </>
  );
}

function ViewerBody({ doc }: { doc: DocumentRecord }) {
  if (doc.fileType === 'image') return <ImagePages doc={doc} />;
  if (doc.fileType === 'txt') return <TextViewer relPath={doc.relPath} />;
  if (doc.fileType === 'pptx') return <OpenExternally doc={doc} label="PowerPoint" />;
  return <BinaryDoc doc={doc} kind={doc.fileType as WebDocKind} />;
}

function ImagePages({ doc }: { doc: DocumentRecord }) {
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const [index, setIndex] = useState(0);
  const pages = useQuery(async (db) => {
    const rows = await pagesForDocument(db, doc.id);
    return rows.length > 0 ? rows.map((p) => p.relPath) : [doc.relPath];
  }, [doc.id]);

  if (!pages.data) return <ActivityIndicator style={styles.flex} color={theme.accent} />;

  return (
    <View style={[styles.flex, { backgroundColor: theme.background }]}>
      <FlatList
        data={pages.data}
        keyExtractor={(item, i) => `${item}-${i}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
        }
        renderItem={({ item }) => (
          <View style={{ width }}>
            <ZoomableImage uri={resolve(item).uri} />
          </View>
        )}
      />
      {pages.data.length > 1 && (
        <View style={[styles.counter, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="small">
            {index + 1} / {pages.data.length}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

function BinaryDoc({ doc, kind }: { doc: DocumentRecord; kind: WebDocKind }) {
  const theme = useTheme();
  const [state, setState] = useState<{ base64?: string; tooBig?: boolean; error?: string }>({});

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const file = resolve(doc.relPath);
        if ((file.size ?? 0) > MAX_INLINE_BYTES) {
          if (!cancelled) setState({ tooBig: true });
          return;
        }
        const base64 = await file.base64();
        if (!cancelled) setState({ base64 });
      } catch (e) {
        if (!cancelled) setState({ error: e instanceof Error ? e.message : String(e) });
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [doc.relPath]);

  if (state.error != null) {
    return <EmptyState icon="warning-outline" title="Lecture impossible" hint={state.error} />;
  }
  if (state.tooBig) return <OpenExternally doc={doc} label={kind.toUpperCase()} big />;
  if (!state.base64) return <ActivityIndicator style={styles.flex} color={theme.accent} />;

  return <WebDocViewer kind={kind} base64={state.base64} />;
}

function OpenExternally({
  doc,
  label,
  big,
}: {
  doc: DocumentRecord;
  label: string;
  big?: boolean;
}) {
  const theme = useTheme();
  const db = useSQLiteContext();

  async function open() {
    try {
      await exportDocument(db, doc);
    } catch (e) {
      Alert.alert('Impossible', e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <View style={[styles.flex, styles.center, { backgroundColor: theme.background }]}>
      <Ionicons name="open-outline" size={44} color={theme.textSecondary} />
      <ThemedText style={styles.centerText}>
        {big
          ? `Ce fichier ${label} est volumineux.`
          : `L'aperçu ${label} n'est pas disponible dans l'app.`}
      </ThemedText>
      <Pressable onPress={open} style={[styles.btn, { backgroundColor: theme.accent }]}>
        <ThemedText themeColor="background">Ouvrir avec une autre app</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  centerText: { textAlign: 'center' },
  btn: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  counter: {
    position: 'absolute',
    bottom: Spacing.three,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
  },
});
