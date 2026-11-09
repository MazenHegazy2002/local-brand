// Admin: full details of one user (opened from the Users tab), including
// affiliate stats and commissions.
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api, fmtEGP } from '@/lib/api';
import { useT } from '@/lib/i18n';
import { spacing } from '@/lib/tokens';
import { Header, Card, StatusPill, ListState, s } from '@/components/admin/ui';

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Details {
  user: any;
  orders: any[];
  totalSpent: number;
  referredUsers: number;
}

const date = (d?: string | null) => (d ? new Date(d).toLocaleDateString() : '—');

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View style={[s.between, { paddingVertical: 4 }]}>
      <Text style={s.muted}>{label}</Text>
      <Text style={[s.body, { flexShrink: 1, textAlign: 'right' }]}>{value ?? '—'}</Text>
    </View>
  );
}

function Stats({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {items.map(([l, v]) => (
        <View
          key={l}
          style={{
            flexGrow: 1,
            minWidth: '45%',
            padding: 10,
            borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,.06)',
          }}
        >
          <Text style={s.muted}>{l}</Text>
          <Text style={s.strong}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

export default function UserDetails() {
  const { t } = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['admin-user-details', id],
    queryFn: () => api.get<Details>(`/api/admin/users/${id}/details`),
  });
  const u = data?.user;
  const a = u?.affiliate;

  return (
    <View style={s.root}>
      <Header title={u?.name ?? t('User')} back />
      {!u ? (
        <ListState loading={isLoading} error={error} onRetry={refetch} empty={t('Nothing here.')} />
      ) : (
        <ScrollView
          contentContainerStyle={[s.list, { gap: 12 }]}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#fff" />
          }
        >
          <Card>
            <View style={s.between}>
              <Text style={[s.body, { flex: 1 }]} numberOfLines={1}>
                {u.email}
              </Text>
              <StatusPill
                status={a ? 'AFFILIATE' : u.role}
                label={a ? t('Affiliate') : u.role === 'CO_ADMIN' ? 'CO-ADMIN' : u.role}
              />
            </View>
            <Stats
              items={[
                [t('Orders'), u._count.orders],
                [t('Total spent'), fmtEGP(data!.totalSpent)],
                [t('Loyalty points'), u.loyaltyPoints],
                [t('Reviews'), u._count.reviews],
              ]}
            />
          </Card>

          <Card>
            <Text style={s.strong}>{t('Account')}</Text>
            <Row label={t('Phone')} value={u.phone || '—'} />
            <Row
              label={t('Email verified')}
              value={u.emailVerified ? `${t('Yes')} (${date(u.emailVerified)})` : t('No')}
            />
            <Row label={t('Joined')} value={date(u.createdAt)} />
            <Row
              label={t('Status')}
              value={u.deletedAt ? `${t('Suspended')} (${date(u.deletedAt)})` : t('Active')}
            />
            <Row label={t('Referred by code')} value={u.referredBySlug || '—'} />
            <Row label={t('Wishlist items')} value={u._count.wishlist} />
          </Card>

          {a && (
            <Card>
              <Text style={s.strong}>{t('Affiliate')}</Text>
              <Stats
                items={[
                  [t('Total earned'), fmtEGP(Number(a.totalEarnedEgp))],
                  [t('Pending'), fmtEGP(Number(a.pendingEarningsEgp))],
                  [t('Conversions'), a.totalConversions],
                  [t('Signed up via link'), data!.referredUsers],
                ]}
              />
              <Row label={t('Status')} value={a.status} />
              <Row label={t('Tier / level')} value={`${a.tier} · ${a.level}`} />
              <Row label={t('Promo code')} value={a.promoCode} />
              <Row label={t('Referral link')} value={`brandyy.shop/?ref=${a.referralSlug}`} />
              <Row
                label={t('Commission / discount')}
                value={`${a.customCommissionPct ?? '—'}% / ${a.customDiscountPct ?? '—'}%`}
              />
              <Row
                label={t('Platform')}
                value={
                  a.platform
                    ? `${a.platform}${a.platformFollowers ? ` · ${Number(a.platformFollowers).toLocaleString()}` : ''}`
                    : '—'
                }
              />
              <Row label={t('Promo code uses')} value={a._count.promoUsages} />
              <Row
                label={t('Payout')}
                value={
                  a.payoutMethod
                    ? `${a.payoutMethod}${a.payoutDetails ? ` · ${a.payoutDetails}` : ''}`
                    : '—'
                }
              />
              <Row label={t('Joined')} value={date(a.createdAt)} />
              {!!a.applicationNote && (
                <Row label={t('Application note')} value={a.applicationNote} />
              )}
              {a.commissions.length > 0 && (
                <>
                  <Text style={[s.muted, { marginTop: 6 }]}>
                    {t('Latest commissions')} ({a._count.commissions})
                  </Text>
                  {a.commissions.map((c: any) => (
                    <Row
                      key={c.id}
                      label={`#${c.orderId.slice(0, 8)} · ${date(c.createdAt)}`}
                      value={`${fmtEGP(Number(c.commissionEgp))} · ${c.status}`}
                    />
                  ))}
                </>
              )}
            </Card>
          )}

          {u.sellerProfile && (
            <Card>
              <Text style={s.strong}>{t('Store')}</Text>
              <Row label={t('Store name')} value={u.sellerProfile.storeName} />
              <Row label={t('Status')} value={u.sellerProfile.status} />
              <Row
                label={t('Location')}
                value={
                  [u.sellerProfile.city, u.sellerProfile.governorate].filter(Boolean).join(', ') ||
                  '—'
                }
              />
            </Card>
          )}

          <Card>
            <Text style={s.strong}>
              {t('Addresses')} ({u.addresses.length})
            </Text>
            {u.addresses.length ? (
              u.addresses.map((ad: any) => (
                <Text key={ad.id} style={s.body}>
                  {[ad.street, ad.city, ad.governorate].filter(Boolean).join(', ')}
                </Text>
              ))
            ) : (
              <Text style={s.muted}>{t('No saved addresses.')}</Text>
            )}
          </Card>

          <Card>
            <Text style={s.strong}>{t('Latest orders')}</Text>
            {data!.orders.length ? (
              data!.orders.map(o => (
                <Row
                  key={o.id}
                  label={`#${o.id.slice(0, 8)} · ${date(o.createdAt)}`}
                  value={`${fmtEGP(o.totalAmount)} · ${o.status}`}
                />
              ))
            ) : (
              <Text style={s.muted}>{t('No orders yet.')}</Text>
            )}
          </Card>
          <View style={{ height: spacing.page }} />
        </ScrollView>
      )}
    </View>
  );
}
