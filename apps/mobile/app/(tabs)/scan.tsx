import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from '@/lib/animated';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { Button } from '../../src/components/ui/Button';
import { colors, radius, spacing, typography } from '../../src/theme';

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const result = await api.get(`/stores/qr/${data}`) as {
        store: { id: string; tenantId: string };
        spot: { id: string; spotNumber: string };
      };
      router.push(`/store/${result.store.id}?tenantId=${result.store.tenantId}&spotId=${result.spot.id}`);
    } catch {
      Alert.alert('خطأ', 'رمز QR غير صالح', [
        { text: 'إعادة المسح', onPress: () => setScanned(false) },
      ]);
    }
  };

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Ionicons name="camera-outline" size={64} color={colors.textMuted} />
        <Text style={styles.permTitle}>نحتاج إذن الكاميرا</Text>
        <Text style={styles.permDesc}>لمسح رمز QR الموجود على موقف سيارتك</Text>
        <Button title="السماح بالكاميرا" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      <Animated.View entering={FadeIn.duration(600)} style={styles.overlay}>
        <View style={styles.topOverlay}>
          <Text style={styles.scanTitle}>امسح رمز QR</Text>
          <Text style={styles.scanDesc}>وجّه الكاميرا نحو الرمز الموجود على الموقف</Text>
        </View>

        <View style={styles.frameContainer}>
          <View style={styles.frame}>
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
          </View>
        </View>

        <View style={styles.bottomOverlay}>
          {scanned ? (
            <Button title="إعادة المسح" variant="outline" onPress={() => setScanned(false)} />
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

const FRAME_SIZE = 250;
const CORNER = 30;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.base,
    backgroundColor: colors.background,
  },
  permTitle: { ...typography.h3, color: colors.textPrimary, textAlign: 'center' },
  permDesc: { ...typography.bodySm, color: colors.textMuted, textAlign: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  topOverlay: { paddingTop: 80, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingBottom: spacing.xl },
  scanTitle: { ...typography.h2, color: '#fff' },
  scanDesc: { ...typography.bodySm, color: 'rgba(255,255,255,0.7)', marginTop: spacing.xs },
  frameContainer: { alignItems: 'center', justifyContent: 'center' },
  frame: { width: FRAME_SIZE, height: FRAME_SIZE, position: 'relative' },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: colors.accent, borderWidth: 3 },
  topRight: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: radius.sm },
  topLeft: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: radius.sm },
  bottomRight: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: radius.sm },
  bottomLeft: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: radius.sm },
  bottomOverlay: { paddingBottom: 100, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingTop: spacing.xl },
});
