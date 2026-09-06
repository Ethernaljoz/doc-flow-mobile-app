import { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, TurboModuleRegistry, View } from 'react-native';
import type {
  WebView as WebViewClass,
  WebViewMessageEvent,
  WebViewProps,
} from 'react-native-webview';

import { EmptyState } from '@/components/empty-state';
import { ViewerError } from '@/components/viewers/viewer-error';
import { useTheme } from '@/hooks/use-theme';
import { buildWebDocHtml, type WebDocKind } from '@/services/viewer-html';

/**
 * `react-native-webview` exécute `TurboModuleRegistry.getEnforcing('RNCWebViewModule')`
 * dès l'import : ça lève tant que le module natif n'est pas dans le binaire
 * (dev client pas régénéré). On sonde donc le registre et on ne `require` la
 * lib qu'en présence du natif. La référence est mise en cache (identité stable).
 */
let cachedWebView: typeof WebViewClass | null | undefined;

function loadWebView(): typeof WebViewClass | null {
  if (cachedWebView !== undefined) return cachedWebView;
  if (Platform.OS === 'web' || TurboModuleRegistry.get('RNCWebViewModule') == null) {
    cachedWebView = null;
    return cachedWebView;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedWebView = (require('react-native-webview') as typeof import('react-native-webview'))
      .WebView;
  } catch {
    cachedWebView = null;
  }
  return cachedWebView;
}

export const isWebViewAvailable = (): boolean => loadWebView() != null;

/** Rend la WebView native résolue paresseusement (référence en cache, stable). */
function LazyWebView(props: WebViewProps) {
  const WebView = loadWebView();
  // eslint-disable-next-line react-hooks/static-components
  return WebView ? <WebView {...props} /> : null;
}

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

  if (!isWebViewAvailable()) {
    return (
      <EmptyState
        icon="construct-outline"
        title="Aperçu indisponible"
        hint="Reconstruisez le client de développement pour lire les PDF et fichiers Office (react-native-webview)."
      />
    );
  }

  if (error) {
    return <ViewerError message={error} />;
  }

  function onMessage(e: WebViewMessageEvent) {
    const msg = e.nativeEvent.data;
    if (msg === 'ready') setReady(true);
    else if (msg.startsWith('error:')) setError(msg.slice(6));
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <LazyWebView
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
