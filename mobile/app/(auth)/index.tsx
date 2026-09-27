// Screen 2a — Onboarding (3-step pager)
import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Image, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radii, spacing } from '@/lib/tokens';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    title: 'Egyptian brands,\ncurated for you',
    titleAr: 'ماركات مصرية\nبالنسبة لك',
    sub: 'Discover and shop authentic local brands',
    subAr: 'اكتشف وتسوق من الماركات المحلية الأصيلة',
    image: require('../../assets/onboarding-1.png'),
  },
  {
    title: 'Fast delivery\nacross Egypt',
    titleAr: 'توصيل سريع\nفي جميع أنحاء مصر',
    sub: 'Free shipping over 1,000 EGP to 27 governorates',
    subAr: 'شحن مجاني عند الطلب فوق ١٠٠٠ جنيه لـ ٢٧ محافظة',
    image: require('../../assets/onboarding-2.png'),
  },
  {
    title: 'Earn points\nwith every order',
    titleAr: 'اكسب نقاط\nمع كل طلب',
    sub: 'Loyalty points you can spend like cash',
    subAr: 'نقاط ولاء يمكنك إنفاقها كالنقود',
    image: require('../../assets/onboarding-3.png'),
  },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const router = useRouter();
  const slide = SLIDES[step];

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <Image source={slide.image} style={styles.bg} resizeMode="cover" />
      <View style={styles.overlay} />

      {/* Language pill */}
      <Pressable style={styles.langPill} onPress={() => setLang(lang === 'en' ? 'ar' : 'en')}>
        <Text style={styles.langText}>{lang === 'en' ? 'عربي' : 'EN'}</Text>
      </Pressable>

      <View style={styles.content}>
        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>

        <Text style={styles.title}>{lang === 'ar' ? slide.titleAr : slide.title}</Text>
        <Text style={styles.sub}>{lang === 'ar' ? slide.subAr : slide.sub}</Text>

        {step < SLIDES.length - 1 ? (
          <Pressable style={styles.btnPrimary} onPress={() => setStep(step + 1)}>
            <Text style={styles.btnPrimaryText}>{lang === 'ar' ? 'التالي' : 'Next'}</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.btnPrimary} onPress={() => router.push('/(auth)/sign-in')}>
            <Text style={styles.btnPrimaryText}>{lang === 'ar' ? 'ابدأ' : 'Get started'}</Text>
          </Pressable>
        )}
        <Pressable style={styles.btnSecondary} onPress={() => router.push('/(auth)/sign-in')}>
          <Text style={styles.btnSecondaryText}>{lang === 'ar' ? 'تخطي' : 'Skip'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.navy },
  bg: { position: 'absolute', width, height },
  overlay: {
    position: 'absolute',
    width,
    height,
    backgroundColor: 'rgba(14,22,51,0.55)',
  },
  langPill: {
    position: 'absolute',
    top: 60,
    right: spacing.page,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.pill,
  },
  langText: { color: '#fff', fontFamily: 'Inter-SemiBold', fontSize: 13 },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.page,
    paddingBottom: 56,
  },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 24 },
  dot: { height: 4, width: 8, borderRadius: 99, backgroundColor: 'rgba(255,255,255,.35)' },
  dotActive: { width: 22, backgroundColor: colors.accent },
  title: {
    fontFamily: 'InstrumentSerif-Regular',
    fontSize: 46,
    color: '#fff',
    lineHeight: 52,
    marginBottom: 12,
  },
  sub: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: 'rgba(255,255,255,.75)',
    marginBottom: 32,
  },
  btnPrimary: {
    height: 54,
    borderRadius: radii.button,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  btnPrimaryText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: colors.ink },
  btnSecondary: {
    height: 54,
    borderRadius: radii.button,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: { fontFamily: 'Inter-SemiBold', fontSize: 16, color: '#fff' },
});
