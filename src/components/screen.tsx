import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ScreenProps {
  title?: string;
  headerRight?: ReactNode;
  edges?: Edge[];
  children: ReactNode;
}

/** Conteneur d'écran : fond thémé + safe area + titre optionnel façon iOS Files. */
export function Screen({ title, headerRight, edges = ['top'], children }: ScreenProps) {
  const theme = useTheme();
  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: theme.background }]}>
      {title != null && (
        <View style={styles.header}>
          <ThemedText type="subtitle">{title}</ThemedText>
          {headerRight}
        </View>
      )}
      <View style={styles.body}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  body: {
    flex: 1,
  },
});
