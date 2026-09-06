import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { importDocument } from '@/services/documents';
import { scanBuffer } from '@/services/scan-buffer';
import { scanDocuments } from '@/services/scanner';

type Busy = null | 'scan' | 'import';

export default function ScanScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const [busy, setBusy] = useState<Busy>(null);

  async function onScan() {
    if (busy) return;
    setBusy('scan');
    try {
      const result = await scanDocuments();
      if (result.status === 'success') {
        scanBuffer.set(result.images);
        router.push('/scan/review');
      } else if (result.status === 'unavailable') {
        router.push('/scan/camera');
      }
    } finally {
      setBusy(null);
    }
  }

  async function onImport() {
    if (busy) return;
    setBusy('import');
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      const id = await importDocument(db, {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
        size: asset.size,
      });
      router.push(`/document/${id}`);
    } catch (e) {
      Alert.alert('Import impossible', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen title="Numériser">
      <View style={styles.body}>
        <ActionCard
          icon="camera-outline"
          title="Numériser un document"
          subtitle="Caméra, détection des bords, filtre N&B."
          loading={busy === 'scan'}
          disabled={busy !== null}
          onPress={onScan}
        />
        <ActionCard
          icon="folder-outline"
          title="Importer un fichier"
          subtitle="PDF, Word, Excel, PowerPoint, images, texte."
          loading={busy === 'import'}
          disabled={busy !== null}
          onPress={onImport}
        />
      </View>
    </Screen>
  );
}

function ActionCard({
  icon,
  title,
  subtitle,
  loading,
  disabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement },
        (pressed || disabled) && styles.pressed,
      ]}>
      {loading ? (
        <ActivityIndicator color={theme.accent} />
      ) : (
        <Ionicons name={icon} size={32} color={theme.accent} />
      )}
      <ThemedText>{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
        {subtitle}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    gap: Spacing.three,
    padding: Spacing.three,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.four,
    padding: Spacing.four,
  },
  pressed: {
    opacity: 0.6,
  },
  center: {
    textAlign: 'center',
  },
});
