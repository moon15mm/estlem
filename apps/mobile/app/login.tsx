import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../src/components/ui/Button';
import { useAuth, UserType } from '../src/stores/useAuth';
import { colors, radius, spacing, typography } from '../src/theme';

type LoginMode = UserType;

const MODES: Array<{ key: LoginMode; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'customer', label: 'عميل', icon: 'person-outline' },
  { key: 'staff', label: 'محل', icon: 'storefront-outline' },
  { key: 'superadmin', label: 'أدمن', icon: 'shield-checkmark-outline' },
];

function routeFor(type: UserType) {
  if (type === 'superadmin') return '/admin';
  if (type === 'staff') return '/staff';
  return '/(tabs)';
}

export default function LoginScreen() {
  const router = useRouter();
  const session = useAuth((state) => state.session);
  const sendCustomerOtp = useAuth((state) => state.sendCustomerOtp);
  const verifyCustomerOtp = useAuth((state) => state.verifyCustomerOtp);
  const loginStaff = useAuth((state) => state.loginStaff);
  const loginAdmin = useAuth((state) => state.loginAdmin);

  const [mode, setMode] = useState<LoginMode>('customer');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [secret, setSecret] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.accessToken) router.replace(routeFor(session.type));
  }, [router, session]);

  const title = useMemo(() => {
    if (mode === 'customer') return otpSent ? 'أدخل رمز التحقق' : 'دخول العميل';
    if (mode === 'staff') return 'دخول المحل';
    return 'دخول الأدمن';
  }, [mode, otpSent]);

  const subtitle = useMemo(() => {
    if (mode === 'customer') return otpSent ? `تم إرسال رمز التحقق إلى ${mobile}` : 'أدخل رقم جوالك لاستلام رمز التحقق.';
    if (mode === 'staff') return 'ادخل رقم جوال الموظف و PIN أو كلمة المرور.';
    return 'ادخل بريد الأدمن وكلمة المرور.';
  }, [mode, otpSent, mobile]);

  const submit = async () => {
    setLoading(true);
    try {
      if (mode === 'customer') {
        if (!otpSent) {
          // Step 1: Send OTP
          if (mobile.trim().length < 9) {
            Alert.alert('رقم غير مكتمل', 'أدخل رقم جوال صحيح للمتابعة.');
            return;
          }
          await sendCustomerOtp(mobile.trim());
          setOtpSent(true);
          Alert.alert('تم الإرسال', 'تم إرسال رمز التحقق.');
        } else {
          // Step 2: Verify OTP
          if (otp.trim().length < 4) {
            Alert.alert('رمز ناقص', 'أدخل رمز التحقق المرسل لجوالك.');
            return;
          }
          await verifyCustomerOtp(mobile.trim(), otp.trim());
          router.replace('/(tabs)');
        }
      } else if (mode === 'staff') {
        await loginStaff(mobile.trim(), secret.trim());
        router.replace('/staff');
      } else {
        await loginAdmin(email.trim(), secret);
        router.replace('/admin');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'خطأ غير معروف';
      Alert.alert('تعذر تسجيل الدخول', typeof msg === 'object' ? JSON.stringify(msg) : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      style={styles.container}
    >
      <View style={styles.header}>
        <View style={styles.logo}>
          <Ionicons name="car-sport" size={34} color="#fff" />
        </View>
        <Text style={styles.brand}>استلم</Text>
        <Text style={styles.subtitle}>اختر نوع الحساب للمتابعة</Text>
      </View>

      <View style={styles.modeRow}>
        {MODES.map((item) => {
          const active = mode === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => {
                setMode(item.key);
                setSecret('');
                setOtpSent(false);
                setOtp('');
              }}
              style={[styles.modeButton, active && styles.modeButtonActive]}
            >
              <Ionicons name={item.icon} size={20} color={active ? '#fff' : colors.primary} />
              <Text style={[styles.modeText, active && styles.modeTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.form}>
        <View style={styles.formHeading}>
          <Text style={styles.formTitle}>{title}</Text>
          <Text style={styles.formSubtitle}>{subtitle}</Text>
        </View>

        {mode === 'superadmin' ? (
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="البريد الإلكتروني"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
        ) : (
          <TextInput
            value={mobile}
            onChangeText={setMobile}
            placeholder="رقم الجوال"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            editable={mode !== 'customer' || !otpSent}
            style={[styles.input, mode === 'customer' && otpSent && styles.inputDisabled]}
          />
        )}

        {mode === 'customer' && otpSent ? (
          <>
            <TextInput
              value={otp}
              onChangeText={setOtp}
              placeholder="رمز التحقق"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              style={[styles.input, { textAlign: 'center', fontSize: 24, letterSpacing: 8 }]}
            />
            <Pressable onPress={() => { setOtpSent(false); setOtp(''); }}>
              <Text style={styles.changeNumber}>تغيير رقم الجوال</Text>
            </Pressable>
          </>
        ) : null}

        {mode !== 'customer' ? (
          <TextInput
            value={secret}
            onChangeText={setSecret}
            placeholder={mode === 'staff' ? 'PIN أو كلمة المرور' : 'كلمة المرور'}
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            style={styles.input}
          />
        ) : null}

        <Button
          title={mode === 'customer' ? (otpSent ? 'تأكيد الرمز' : 'إرسال رمز التحقق') : 'تسجيل دخول'}
          onPress={submit}
          loading={loading}
          full
          icon={loading ? <ActivityIndicator color="#fff" /> : <Ionicons name={otpSent ? 'checkmark-circle-outline' : 'log-in-outline'} size={20} color="#fff" />}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.base,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  brand: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  modeButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modeText: {
    ...typography.caption,
    fontFamily: typography.label.fontFamily,
    color: colors.primary,
  },
  modeTextActive: {
    color: '#fff',
  },
  form: {
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.xl,
    padding: spacing.base,
  },
  formHeading: {
    gap: spacing.xs,
  },
  formTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  formSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  input: {
    height: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.backgroundSecondary,
    ...typography.body,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  inputDisabled: {
    opacity: 0.5,
    backgroundColor: colors.border,
  },
  changeNumber: {
    ...typography.bodySm,
    color: colors.primary,
    textAlign: 'center',
    marginTop: -4,
  },
});
