import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  hint?: string;
}

export function EmptyState({ icon, title, hint }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View style={styles.root}>
      <Ionicons name={icon} size={44} color={theme.textSecondary} />
      <ThemedText type="small" themeColor="text" style={styles.title}>
        {title}
      </ThemedText>
      {hint != null && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          {hint}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  title: {
    marginTop: Spacing.one,
  },
  hint: {
    textAlign: 'center',
  },
});
