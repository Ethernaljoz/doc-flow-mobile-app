import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DATABASE_NAME, migrate } from '@/services/db';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const scheme = useColorScheme();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="document/[id]" options={{ headerShown: true, title: 'Document' }} />
        <Stack.Screen name="viewer/[id]" options={{ headerShown: true, title: 'Lecture' }} />
        <Stack.Screen name="note/[id]" options={{ headerShown: true, title: 'Note' }} />
        <Stack.Screen name="scan/camera" options={{ headerShown: false }} />
        <Stack.Screen name="scan/review" options={{ headerShown: true, title: 'Revue du scan' }} />
        <Stack.Screen
          name="modal/category-picker"
          options={{ presentation: 'modal', headerShown: true, title: 'Catégorie' }}
        />
        <Stack.Screen
          name="modal/export"
          options={{ presentation: 'modal', headerShown: true, title: 'Exporter' }}
        />
        <Stack.Screen
          name="modal/note-link"
          options={{ presentation: 'modal', headerShown: true, title: 'Associer à un document' }}
        />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrate}>
        <RootNavigator />
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}
