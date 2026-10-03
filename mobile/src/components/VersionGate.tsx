import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  AppState,
  Linking,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { api } from '@/lib/api';
import { colors, radii, spacing } from '@/lib/tokens';

type AppConfig = {
  status: 'ok' | 'update_available' | 'update_required' | 'stopped';
  latestVersion: string;
  minVersion: string;
  message: string;
  storeUrl: string | null;
};

const VERSION = Constants.expoConfig?.version ?? '0.0.0';
const CONFIG_PATH = `/api/app/config?version=${encodeURIComponent(VERSION)}&platform=${Platform.OS}`;

// Fails open: children always render; only a server answer of stopped/update_required blocks.
// On a failed re-check the last server answer is kept.
export default function VersionGate({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [checking, setChecking] = useState(false);
  const prompted = useRef(false);
  const lastCheck = useRef(0);

  const check = () => {
    // Coming back to the foreground re-checks at most once a minute.
    if (Date.now() - lastCheck.current < 60_000) return;
    lastCheck.current = Date.now();
    setChecking(true);
    api
      .get<AppConfig>(CONFIG_PATH)
      .then(c => {
        setConfig(c);
        if (c?.status === 'update_available' && !prompted.current) {
          prompted.current = true; // once per session
          const url = c.storeUrl;
          Alert.alert('Update available', c.message || 'A new version of Brandyy is available.', [
            { text: 'Later', style: 'cancel' },
            ...(url ? [{ text: 'Update', onPress: () => Linking.openURL(url) }] : []),
          ]);
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  };

  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', s => s === 'active' && check());
    return () => sub.remove();
  }, []);

  const status = config?.status;
  const blocked = status === 'stopped' || status === 'update_required';

  return (
    <>
      {children}
      {blocked && (
        <View style={styles.root}>
          <StatusBar barStyle="light-content" />
          <Text style={styles.wordmark}>brandyy.</Text>
          <Text style={styles.title}>
            {status === 'stopped' ? "We'll be right back" : 'Update required'}
          </Text>
          <Text style={styles.message}>
            {config?.message ||
              (status === 'stopped'
                ? 'Brandyy is temporarily unavailable. Please try again shortly.'
                : 'Please update Brandyy to keep shopping.')}
          </Text>

          {status === 'stopped' ? (
            <Pressable style={styles.btn} onPress={check} disabled={checking}>
              <Text style={styles.btnText}>{checking ? 'Checking…' : 'Try again'}</Text>
            </Pressable>
          ) : (
            <>
              {config?.storeUrl ? (
                <Pressable style={styles.btn} onPress={() => Linking.openURL(config.storeUrl!)}>
                  <Text style={styles.btnText}>Update now</Text>
                </Pressable>
              ) : null}
              <Text style={styles.version}>
                Your version {VERSION} · Required {config?.minVersion}
              </Text>
            </>
          )}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
    backgroundColor: colors.navy,
    justifyContent: 'center',
    paddingHorizontal: spacing.page,
  },
  wordmark: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 28,
    color: '#fff',
    marginBottom: 32,
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 30,
    color: '#fff',
    marginBottom: spacing.md,
  },
  message: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,.8)',
    marginBottom: 32,
  },
  btn: {
    height: 56,
    borderRadius: radii.button,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  btnText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: colors.ink },
  version: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,.55)',
    textAlign: 'center',
  },
});
