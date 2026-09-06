import { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { ViewerError } from '@/components/viewers/viewer-error';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { readText } from '@/services/files';

export function TextViewer({ relPath }: { relPath: string }) {
  const theme = useTheme();

  const result = useMemo(() => {
    try {
      return { text: readText(relPath) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }, [relPath]);

  if (result.error != null) return <ViewerError message={result.error} />;

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <ThemedText style={styles.mono}>{result.text || '(fichier vide)'}</ThemedText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three },
  mono: { fontFamily: 'monospace', fontSize: 13, lineHeight: 20 },
});
