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
import { useAuth } from '@/store/auth';
import { colors, radii, spacing } from '@/lib/tokens';

const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://brandyy.shop';

export default function SignIn() {
  const [tab, setTab] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
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
        <Text style={styles.wordmark}>brandyy</Text>
        <Text style={styles.tagline}>Your local brands marketplace</Text>

        <View style={styles.seg}>
          {(['signin', 'register'] as const).map(t => (
            <Pressable
              key={t}
              style={[styles.segBtn, tab === t && styles.segBtnActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.segText, tab === t && styles.segTextActive]}>
                {t === 'signin' ? 'Sign in' : 'Register'}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === 'register' && (
          <TextInput
            style={styles.input}
            placeholder="Full name"
            placeholderTextColor={colors.placeholder}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.placeholder}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.placeholder}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable
          style={[styles.btnPrimary, loading && { opacity: 0.7 }]}
          onPress={tab === 'signin' ? handleSignIn : handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>{tab === 'signin' ? 'Sign in' : 'Create account'}</Text>
          )}
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable style={styles.btnGoogle}>
          <Text style={styles.btnGoogleText}>Continue with Google</Text>
        </Pressable>
        <Pressable style={styles.btnApple}>
          <Text style={styles.btnAppleText}>Continue with Apple</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  inner: { flexGrow: 1, paddingHorizontal: spacing.page, paddingTop: 80, paddingBottom: 40 },
  wordmark: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 32,
    color: colors.primary,
    textAlign: 'center',
  },
  tagline: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 40,
  },
  seg: {
    flexDirection: 'row',
    backgroundColor: '#efece6',
    borderRadius: radii.button,
    padding: 4,
    marginBottom: 24,
  },
  segBtn: { flex: 1, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  segBtnActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  segText: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: colors.muted },
  segTextActive: { color: colors.ink },
  input: {
    height: 52,
    borderRadius: radii.input,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    paddingHorizontal: 16,
    marginBottom: 12,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  btnPrimary: {
    height: 54,
    borderRadius: radii.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#fff' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontFamily: 'Inter-Regular', fontSize: 13, color: colors.muted },
  btnGoogle: {
    height: 52,
    borderRadius: radii.button,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  btnGoogleText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: colors.ink },
  btnApple: {
    height: 52,
    borderRadius: radii.button,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnAppleText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#fff' },
});
