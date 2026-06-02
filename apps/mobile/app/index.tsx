import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuth } from '../src/stores/useAuth';
import { colors } from '../src/theme';

export default function IndexScreen() {
  const hydrated = useAuth((state) => state.hydrated);
  const session = useAuth((state) => state.session);

  if (!hydrated) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (session?.type === 'superadmin') return <Redirect href="/admin" />;
  if (session?.type === 'staff') return <Redirect href="/staff" />;
  if (session?.type === 'customer') return <Redirect href="/(tabs)" />;
  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
