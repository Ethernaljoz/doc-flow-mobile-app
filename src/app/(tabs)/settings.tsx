import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useReducer } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useQuery } from '@/hooks/use-query';
import { countDocuments, listCategories } from '@/services/db';
import { clearExports, formatBytes, storageUsage } from '@/services/files';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const categories = useQuery((db) => listCategories(db), []);
  const docCount = useQuery((db) => countDocuments(db), []);
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const usage = storageUsage();

  function purgeTemp() {
    clearExports();
    refresh();
  }

  return (
    <Screen title="Réglages">
      <ScrollView contentContainerStyle={styles.content}>
        <Section title="Stockage">
          <Line label="Documents" value={`${docCount.data ?? 0}`} />
          <Line label="Fichiers" value={formatBytes(usage.documentsBytes)} />
          <Line label="Cache" value={formatBytes(usage.cacheBytes)} />
          <TapRow icon="trash-outline" label="Vider les fichiers temporaires" onPress={purgeTemp} />
        </Section>

        <Section title="Catégories">
          {(categories.data ?? []).map((c) => (
            <View key={c.id} style={styles.catRow}>
              <View style={[styles.dot, { backgroundColor: c.color }]} />
              <ThemedText type="small">{c.name}</ThemedText>
            </View>
          ))}
          <TapRow
            icon="add"
            label="Nouvelle catégorie"
            onPress={() => router.push('/modal/category-new')}
          />
        </Section>

        <Section title="Confidentialité">
          <View style={styles.privacyRow}>
            <Ionicons name="lock-closed-outline" size={16} color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
              Toutes les données restent sur cet appareil. Aucun cloud.
            </ThemedText>
          </View>
        </Section>

        <ThemedText type="small" themeColor="textSecondary" style={styles.version}>
          DocFlow v{Constants.expoConfig?.version ?? '1.0.0'}
        </ThemedText>
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
        {title.toUpperCase()}
      </ThemedText>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>{children}</View>
    </View>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <ThemedText type="small">{label}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {value}
      </ThemedText>
    </View>
  );
}

function TapRow({
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
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tapRow, pressed && { opacity: 0.6 }]}>
      <Ionicons name={icon} size={16} color={theme.accent} />
      <ThemedText type="small" themeColor="accent">
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.four },
  section: { gap: Spacing.two },
  sectionTitle: { marginLeft: Spacing.one },
  card: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.two },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  tapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  flex: { flex: 1 },
  version: { textAlign: 'center', marginTop: Spacing.two },
});
