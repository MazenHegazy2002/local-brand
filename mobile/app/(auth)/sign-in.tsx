// Screen 2b — Sign in / Register
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '@/store/auth';
import { colors, radii, spacing } from '@/lib/tokens';

const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://brandyy.shop';

export default function SignIn() {
  const router = useRouter();
  const [tab, setTab] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  async function handleSignIn() {
    if (!email || !password) {
      Alert.alert('Missing fields');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e: unknown) {
      Alert.alert('Sign in failed', (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    if (!name || !email || !password) {
      Alert.alert('Missing fields');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: email.trim(), password, role: 'BUYER' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Registration failed');
      await signIn(email.trim(), password);
    } catch (e: unknown) {
      Alert.alert('Registration failed', (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.root}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        {/* Back */}
        <Pressable style={styles.back} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.ink} strokeWidth={2} />
        </Pressable>

        <Text style={styles.heading}>{tab === 'signin' ? 'Welcome back' : 'Create account'}</Text>
        <Text style={styles.sub}>
          {tab === 'signin'
            ? 'Sign in to track orders and use your points.'
            : 'Join Brandyy to discover local Egyptian brands.'}
        </Text>

        {/* Tab switcher */}
        <View style={styles.seg}>
          {(['signin', 'register'] as const).map(t => (
            <Pressable
              key={t}
              style={[styles.segBtn, tab === t && styles.segBtnActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.segText, tab === t && styles.segTextActive]}>
                {t === 'signin' ? 'Sign in' : 'Create account'}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === 'register' && (
          <>
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={styles.input}
              placeholder="Omar Hassan"
              placeholderTextColor={colors.placeholder}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </>
        )}

        <Text style={styles.label}>Email or phone</Text>
        <TextInput
          style={styles.input}
          placeholder="omar@gmail.com"
          placeholderTextColor={colors.placeholder}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="••••••••"
            placeholderTextColor={colors.placeholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPw}
          />
          <Pressable style={styles.eyeBtn} onPress={() => setShowPw(!showPw)}>
            {showPw ? (
              <EyeOff size={18} color={colors.placeholder} strokeWidth={2} />
            ) : (
              <Eye size={18} color={colors.placeholder} strokeWidth={2} />
            )}
          </Pressable>
        </View>

        {tab === 'signin' && (
          <Pressable style={styles.forgotRow}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>
        )}

        <Pressable
          style={[styles.btnPrimary, loading && { opacity: 0.7 }]}
          onPress={tab === 'signin' ? handleSignIn : handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnPrimaryText}>
              {tab === 'signin' ? 'Sign in' : 'Create account'}
            </Text>
          )}
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialRow}>
          <Pressable style={[styles.socialBtn, styles.socialBtnLight]}>
            <Text style={styles.socialTextDark}>G Google</Text>
          </Pressable>
          <Pressable style={[styles.socialBtn, styles.socialBtnDark]}>
            <Text style={styles.socialTextLight}> Apple</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  inner: { flexGrow: 1, paddingHorizontal: spacing.page, paddingTop: 56, paddingBottom: 40 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  heading: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 34,
    color: colors.ink,
    marginBottom: 8,
  },
  sub: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.primary,
    marginBottom: 28,
    lineHeight: 20,
  },
  seg: {
    flexDirection: 'row',
    backgroundColor: '#efece6',
    borderRadius: radii.button,
    padding: 4,
    marginBottom: 24,
  },
  segBtn: {
    flex: 1,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segBtnActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  segText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.muted },
  segTextActive: { color: colors.ink },
  label: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: colors.ink,
    marginBottom: 6,
  },
  input: {
    height: 52,
    borderRadius: radii.input,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 48 },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 14,
    padding: 2,
  },
  forgotRow: { alignItems: 'flex-end', marginTop: -8, marginBottom: 20 },
  forgotText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.primary },
  btnPrimary: {
    height: 56,
    borderRadius: radii.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#fff' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.muted },
  socialRow: { flexDirection: 'row', gap: 12 },
  socialBtn: {
    flex: 1,
    height: 52,
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialBtnLight: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  socialBtnDark: { backgroundColor: '#111' },
  socialTextDark: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: colors.ink },
  socialTextLight: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#fff' },
});
