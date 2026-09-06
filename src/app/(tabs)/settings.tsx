import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useQuery } from '@/hooks/use-query';
import { countDocuments, listCategories } from '@/services/db';
import { formatBytes, storageUsage } from '@/services/files';

export default function SettingsScreen() {
  const theme = useTheme();
  const categories = useQuery((db) => listCategories(db), []);
  const docCount = useQuery((db) => countDocuments(db), []);
  const usage = storageUsage();

  return (
    <Screen title="Réglages">
      <ScrollView contentContainerStyle={styles.content}>
        <Section title="Stockage">
          <Line label="Documents" value={`${docCount.data ?? 0}`} />
          <Line label="Fichiers" value={formatBytes(usage.documentsBytes)} />
          <Line label="Cache" value={formatBytes(usage.cacheBytes)} />
        </Section>

        <Section title="Catégories">
          {(categories.data ?? []).map((c) => (
            <View key={c.id} style={styles.catRow}>
              <View style={[styles.dot, { backgroundColor: c.color }]} />
              <ThemedText type="small">{c.name}</ThemedText>
            </View>
          ))}
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

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    marginLeft: Spacing.one,
  },
  card: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  version: {
    textAlign: 'center',
    marginTop: Spacing.two,
  },
});
