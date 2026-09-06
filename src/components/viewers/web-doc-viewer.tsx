import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { ViewerError } from '@/components/viewers/viewer-error';
import { useTheme } from '@/hooks/use-theme';
import { buildWebDocHtml, type WebDocKind } from '@/services/viewer-html';

interface Props {
  kind: WebDocKind;
  base64: string;
}

/** Lecteur PDF / Word / Excel : WebView + lib chargée depuis cdnjs. */
export function WebDocViewer({ kind, base64 }: Props) {
  const theme = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const html = useMemo(() => buildWebDocHtml(kind, base64, theme), [kind, base64, theme]);

  function onMessage(e: WebViewMessageEvent) {
    const msg = e.nativeEvent.data;
    if (msg === 'ready') setReady(true);
    else if (msg.startsWith('error:')) setError(msg.slice(6));
  }

  if (error) {
    return <ViewerError message={error} />;
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        style={styles.web}
        onError={(e) => setError(e.nativeEvent.description || 'Erreur WebView')}
      />
      {!ready && (
        <View style={[styles.loading, { backgroundColor: theme.background }]} pointerEvents="none">
          <ActivityIndicator color={theme.accent} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  web: { flex: 1, backgroundColor: 'transparent' },
  loading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
