import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function ScanScreen() {
  const theme = useTheme();

  return (
    <Screen title="Numériser">
      <View style={styles.body}>
        <View style={[styles.actionCard, { backgroundColor: theme.backgroundElement }]}>
          <Ionicons name="camera-outline" size={32} color={theme.accent} />
          <ThemedText>Numériser un document</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            Caméra, détection des bords et filtres N&B — Phase 1.
          </ThemedText>
        </View>

        <View style={[styles.actionCard, { backgroundColor: theme.backgroundElement }]}>
          <Ionicons name="folder-outline" size={32} color={theme.accent} />
          <ThemedText>Importer un fichier</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            PDF, Word, Excel, images, texte — Phase 1.
          </ThemedText>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: Spacing.three,
    padding: Spacing.three,
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.four,
    padding: Spacing.four,
  },
  center: {
    textAlign: 'center',
  },
});
