import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Stack, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { scanBuffer } from '@/services/scan-buffer';
import { haptic } from '@/utils/haptics';

/**
 * Capture de secours quand le module natif de scan n'est pas disponible
 * (Expo Go / avant dev build). Pas de détection de bords : recadrage manuel
 * à l'écran de revue.
 */
export default function ScanCameraScreen() {
  const theme = useTheme();
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [shots, setShots] = useState<string[]>([]);
  const [torch, setTorch] = useState(false);
  const [capturing, setCapturing] = useState(false);

  async function capture() {
    if (capturing || !cameraRef.current) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (photo?.uri) {
        setShots((s) => [...s, photo.uri]);
        haptic.light();
      }
    } finally {
      setCapturing(false);
    }
  }

  function done() {
    if (shots.length === 0) return;
    scanBuffer.set(shots);
    router.replace('/scan/review');
  }

  if (!permission) return <View style={{ flex: 1, backgroundColor: '#000' }} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.permission, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: 'Caméra' }} />
        <Ionicons name="camera-outline" size={44} color={theme.textSecondary} />
        <ThemedText style={styles.center}>Autorisez la caméra pour numériser.</ThemedText>
        <Pressable
          onPress={requestPermission}
          style={[styles.permBtn, { backgroundColor: theme.accent }]}>
          <ThemedText themeColor="background">Autoriser</ThemedText>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} enableTorch={torch} />

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <IconButton icon="close" onPress={() => router.back()} />
          <IconButton
            icon={torch ? 'flash' : 'flash-off'}
            onPress={() => setTorch((t) => !t)}
          />
        </View>

        <View style={styles.bottomBar}>
          <View style={styles.thumbSlot}>
            {shots.length > 0 && (
              <>
                <Image source={{ uri: shots[shots.length - 1] }} style={styles.thumb} />
                <View style={styles.badge}>
                  <ThemedText type="smallBold" themeColor="background">
                    {shots.length}
                  </ThemedText>
                </View>
              </>
            )}
          </View>

          <Pressable onPress={capture} disabled={capturing} style={styles.shutter}>
            <View style={styles.shutterInner} />
          </Pressable>

          <Pressable onPress={done} disabled={shots.length === 0} style={styles.thumbSlot}>
            <ThemedText
              type="smallBold"
              style={[styles.doneText, shots.length === 0 && styles.doneDisabled]}>
              Terminé
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

function IconButton({
  icon,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.iconButton} hitSlop={8}>
      <Ionicons name={icon} size={22} color="#fff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  thumbSlot: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fff',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#3C87F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  doneText: {
    color: '#fff',
  },
  doneDisabled: {
    opacity: 0.4,
  },
  permission: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  permBtn: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  center: {
    textAlign: 'center',
  },
});
