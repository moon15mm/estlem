import { useEffect } from 'react';
import { I18nManager } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  NotoSansArabic_400Regular,
  NotoSansArabic_500Medium,
  NotoSansArabic_600SemiBold,
  NotoSansArabic_700Bold,
} from '@expo-google-fonts/noto-sans-arabic';
import {
  NotoKufiArabic_700Bold,
  NotoKufiArabic_800ExtraBold,
} from '@expo-google-fonts/noto-kufi-arabic';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors } from '../src/theme';
import { useAuth } from '../src/stores/useAuth';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: 'login',
};

// Force RTL
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

export default function RootLayout() {
  const hydrate = useAuth((state) => state.hydrate);
  const hydrated = useAuth((state) => state.hydrated);
  const [fontsLoaded] = useFonts({
    NotoSansArabic_400Regular,
    NotoSansArabic_500Medium,
    NotoSansArabic_600SemiBold,
    NotoSansArabic_700Bold,
    NotoKufiArabic_700Bold,
    NotoKufiArabic_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!fontsLoaded || !hydrated) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" backgroundColor={colors.primary} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_left',
        }}
      >
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="admin" options={{ animation: 'slide_from_left' }} />
        <Stack.Screen name="staff" options={{ animation: 'slide_from_left' }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="cart" options={{ animation: 'slide_from_left' }} />
        <Stack.Screen name="store/[id]" options={{ animation: 'slide_from_left' }} />
        <Stack.Screen name="order/[id]" options={{ animation: 'slide_from_left' }} />
        <Stack.Screen name="scan" options={{ animation: 'fade', presentation: 'fullScreenModal' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
