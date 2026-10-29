// Screen 2a — Onboarding
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ImageBackground,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radii, spacing, screen } from '@/lib/tokens';
import { useT, LANGS, LANG_NAMES } from '@/lib/i18n';
import { useAuth } from '@/store/auth';

const { width, height } = screen;
const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://brandyy.shop';

const SLIDES_STATIC = [
  {
    title: "Egypt's home\nfor local brands",
    sub: 'Discover independent Egyptian labels. Pay cash on delivery, InstaPay or Vodafone Cash, to all 27 governorates.',
  },
  {
    title: 'Fast delivery\nacross Egypt',
    sub: 'Standard 2–4 days. Same-day delivery available in Cairo.',
  },
  {
    title: 'Earn points\nwith every order',
    sub: '10 points per order. 1 pt = 1 EGP at checkout.',
  },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [bgImages, setBgImages] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch(`${BASE}/api/export/public-products?limit=3`)
      .then(r => r.json())
      .then(d => {
        const imgs: string[] = (d.products ?? [])
          .map((p: { image?: string }) => p.image)
          .filter(Boolean);
        if (imgs.length) setBgImages(imgs);
      })
      .catch(() => {});
  }, []);

  const slide = SLIDES_STATIC[step];
  const bgUri = bgImages[step]?.startsWith('/') ? `${BASE}${bgImages[step]}` : bgImages[step];

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {bgUri ? (
        <ImageBackground source={{ uri: bgUri }} style={styles.bg} resizeMode="cover">
          <View style={styles.overlay} />
          <Content slide={slide} step={step} setStep={setStep} router={router} />
        </ImageBackground>
      ) : (
        <View style={[styles.bg, { backgroundColor: colors.navy }]}>
          <Content slide={slide} step={step} setStep={setStep} router={router} />
        </View>
      )}
    </View>
  );
}

function Content({
  slide,
  step,
  setStep,
  router,
}: {
  slide: (typeof SLIDES_STATIC)[0];
  step: number;
  setStep: (s: number) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const { t, lang } = useT();
  const setLang = useAuth(s => s.setLang);
  return (
    <View style={styles.flex}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.wordmark}>brandyy.</Text>
        <Pressable
          style={styles.langBtn}
          onPress={() => setLang(LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length])}
        >
          <Text style={styles.langText}>{LANG_NAMES[lang]}</Text>
        </Pressable>
      </View>

      {/* Bottom content */}
      <View style={styles.content}>
        {/* Indicator */}
        <View style={styles.indicators}>
          {SLIDES_STATIC.map((_, i) => (
            <View key={i} style={[styles.indicator, i === step && styles.indicatorActive]} />
          ))}
        </View>

        <Text style={styles.title}>{t(slide.title)}</Text>
        <Text style={styles.sub}>{t(slide.sub)}</Text>

        {step < SLIDES_STATIC.length - 1 ? (
          <Pressable style={styles.btnPrimary} onPress={() => setStep(step + 1)}>
            <Text style={styles.btnPrimaryText}>{t('Next')}</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.btnPrimary} onPress={() => router.push('/(auth)/sign-in')}>
            <Text style={styles.btnPrimaryText}>{t('Get started')}</Text>
          </Pressable>
        )}
        <Pressable style={styles.btnSecondary} onPress={() => router.push('/(auth)/sign-in')}>
          <Text style={styles.btnSecondaryText}>{t('I already have an account')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.navy },
  bg: { width, height },
  flex: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(14,22,51,0.45)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.page,
    paddingTop: spacing.top,
    paddingBottom: 12,
  },
  langBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  langText: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: '#fff' },
  wordmark: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 24,
    color: '#fff',
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.page,
    paddingBottom: 52,
  },
  indicators: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  indicator: { height: 3, width: 24, borderRadius: 2, backgroundColor: 'rgba(255,255,255,.35)' },
  indicatorActive: { backgroundColor: colors.accent, width: 40 },
  title: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 42,
    color: '#fff',
    lineHeight: 50,
    marginBottom: 12,
  },
  sub: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,.8)',
    lineHeight: 20,
    marginBottom: 32,
  },
  btnPrimary: {
    height: 56,
    borderRadius: radii.button,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  btnPrimaryText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: colors.ink },
  btnSecondary: {
    height: 56,
    borderRadius: radii.button,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  btnSecondaryText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#fff' },
});
