// Admin "More": moderation + finance screens, language, web panel and sign out.
import { View, Text, ScrollView, Pressable, Linking, StyleSheet } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import {
  ShieldAlert,
  Undo2,
  Star,
  LifeBuoy,
  TicketPercent,
  HandCoins,
  Languages,
  Globe,
  LogOut,
  Trash2,
  ChevronRight,
} from 'lucide-react-native';
import { useAuth } from '@/store/auth';
import { API_BASE } from '@/lib/seller';
import { useT, LANGS, LANG_NAMES } from '@/lib/i18n';
import { colors, radii, spacing } from '@/lib/tokens';
import { Header, confirm, glass, s } from '@/components/admin/ui';
import { confirmDeleteAccount } from '@/lib/delete-account';

export default function AdminMore() {
  const router = useRouter();
  const { t, lang } = useT();
  const { user, setLang, signOut } = useAuth();
  const go = (p: string) => () => router.push(p as Href);

  const sections = [
    {
      title: 'Moderation',
      rows: [
        { Icon: ShieldAlert, label: 'Disputes', onPress: go('/(admin)/disputes') },
        { Icon: Undo2, label: 'Returns', onPress: go('/(admin)/returns') },
        { Icon: Star, label: 'Reviews', onPress: go('/(admin)/reviews') },
        { Icon: LifeBuoy, label: 'Support tickets', onPress: go('/(admin)/tickets') },
      ],
    },
    {
      title: 'Marketing & money',
      rows: [
        { Icon: TicketPercent, label: 'Coupons', onPress: go('/(admin)/coupons') },
        { Icon: HandCoins, label: 'Affiliate payouts', onPress: go('/(admin)/payouts') },
      ],
    },
    {
      title: 'Settings',
      rows: [
        {
          Icon: Languages,
          label: 'Language',
          hint: LANG_NAMES[lang],
          onPress: () => setLang(LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length]),
        },
        {
          Icon: Globe,
          label: 'Open full Admin OS on the web',
          onPress: () => Linking.openURL(`${API_BASE}/admin-os`),
        },
      ],
    },
  ];

  return (
    <ScrollView style={s.root} contentContainerStyle={{ paddingBottom: 48 }}>
      <Header title={t('More')} />
      {!!user && (
        <View style={st.me}>
          <View style={st.avatar}>
            <Text style={st.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.strong}>{user.name}</Text>
            <Text style={s.muted}>{user.email}</Text>
          </View>
        </View>
      )}
      {sections.map(sec => (
        <View key={sec.title} style={st.section}>
          <Text style={st.sectionTitle}>{t(sec.title)}</Text>
          <View style={st.card}>
            {sec.rows.map(({ Icon, label, onPress, ...r }, i) => (
              <Pressable key={label} style={[st.row, i > 0 && st.divider]} onPress={onPress}>
                <Icon size={18} color={colors.accent} />
                <Text style={st.label}>{t(label)}</Text>
                {'hint' in r && <Text style={s.muted}>{r.hint as string}</Text>}
                <ChevronRight size={16} color="rgba(255,255,255,.3)" />
              </Pressable>
            ))}
          </View>
        </View>
      ))}
      <Pressable
        style={st.signOut}
        onPress={() =>
          confirm(t('Sign out'), t('Are you sure?'), t('Sign out'), t('Cancel'), () => signOut())
        }
      >
        <LogOut size={18} color="#f87171" />
        <Text style={st.signOutText}>{t('Sign out')}</Text>
      </Pressable>
      <Pressable
        style={[st.signOut, st.deleteBtn]}
        onPress={() => confirmDeleteAccount(t, signOut)}
      >
        <Trash2 size={18} color="#f87171" />
        <Text style={st.signOutText}>{t('Delete account')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  me: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: spacing.page,
    marginBottom: 8,
    padding: 14,
    borderRadius: radii.card,
    backgroundColor: glass,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: 'Outfit-Bold', fontSize: 18, color: '#fff' },
  section: { marginHorizontal: spacing.page, marginTop: 18 },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: 'rgba(255,255,255,.45)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  card: { backgroundColor: glass, borderRadius: radii.card, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15 },
  divider: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.08)' },
  label: { flex: 1, fontFamily: 'Inter-Medium', fontSize: 15, color: '#fff' },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    marginHorizontal: spacing.page,
    marginTop: 28,
    borderRadius: radii.button,
    borderWidth: 1.5,
    borderColor: 'rgba(248,113,113,.4)',
  },
  signOutText: { fontFamily: 'Inter-SemiBold', fontSize: 15, color: '#f87171' },
  deleteBtn: { marginTop: 12, borderColor: 'rgba(248,113,113,.2)' },
});
