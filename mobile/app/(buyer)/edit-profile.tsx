// Edit profile: same fields as the web dashboard's Settings tab (photo, name, phone; email read-only)
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Camera, Check } from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { uploadImage } from '@/lib/seller';
import { useAuth } from '@/store/auth';
import { colors, radii, spacing } from '@/lib/tokens';

interface Profile {
  name: string | null;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  emailVerified: string | null;
}

export default function EditProfile() {
  const router = useRouter();
  const qc = useQueryClient();
  const updateUser = useAuth(s => s.updateUser);
  const { data, isLoading, error } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get<{ user: Profile }>('/api/user/profile'),
  });
  const profile = data?.user;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? '');
    setPhone(profile.phone ?? '');
    setAvatar(profile.avatarUrl);
  }, [profile]);

  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (res.canceled) return;
    const asset = res.assets[0];
    setPreview(asset.uri); // show instantly while the upload runs
    setUploading(true);
    try {
      setAvatar(await uploadImage(asset.uri, asset.mimeType ?? 'image/jpeg'));
    } catch (e) {
      setPreview(null);
      Alert.alert('Upload failed', (e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function removePhoto() {
    setAvatar(null);
    setPreview(null);
  }

  const save = useMutation({
    mutationFn: () =>
      api.patch<{ user: Profile }>('/api/user/profile', {
        name: name.trim(),
        phone: phone.trim() || null,
        avatarUrl: avatar,
      }),
    onSuccess: async ({ user }) => {
      qc.setQueryData(['profile'], { user });
      await updateUser({ name: user.name ?? '', image: user.avatarUrl });
      router.back();
    },
    onError: e => Alert.alert('Could not save', (e as Error).message),
  });

  const initials = (name || profile?.email || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const shown = preview ?? avatar;
  const canSave = !!name.trim() && !uploading && !save.isPending;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Back">
          <ArrowLeft size={20} color={colors.ink} strokeWidth={2} />
        </Pressable>
        <Text style={styles.title}>Edit profile</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : error || !profile ? (
        <Text style={styles.empty}>Couldn't load your profile. Please try again later.</Text>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <View style={styles.avatarBlock}>
              <View>
                <View style={styles.avatar}>
                  {shown ? (
                    <Image source={{ uri: shown }} style={StyleSheet.absoluteFill} />
                  ) : (
                    <Text style={styles.avatarText}>{initials}</Text>
                  )}
                  {uploading && (
                    <View style={styles.avatarBusy}>
                      <ActivityIndicator color="#fff" />
                    </View>
                  )}
                </View>
                <Pressable
                  style={styles.cameraBtn}
                  onPress={pickPhoto}
                  disabled={uploading}
                  accessibilityLabel="Change photo"
                >
                  <Camera size={18} color={colors.navy} strokeWidth={2} />
                </Pressable>
              </View>
              <View style={styles.photoRow}>
                <Pressable style={styles.pill} onPress={pickPhoto} disabled={uploading}>
                  <Text style={[styles.pillText, { color: colors.primary }]}>
                    {shown ? 'Replace photo' : 'Upload photo'}
                  </Text>
                </Pressable>
                {shown && (
                  <Pressable style={styles.pill} onPress={removePhoto} disabled={uploading}>
                    <Text style={[styles.pillText, { color: colors.danger }]}>Remove</Text>
                  </Pressable>
                )}
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.field}>
                <Text style={styles.label}>Full name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={colors.placeholder}
                  autoCapitalize="words"
                  maxLength={100}
                />
              </View>

              <View style={styles.field}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Email</Text>
                  {profile.emailVerified ? (
                    <View style={[styles.badge, { backgroundColor: '#dcfce7' }]}>
                      <Check size={12} color={colors.success} strokeWidth={3} />
                      <Text style={[styles.badgeText, { color: colors.success }]}>Verified</Text>
                    </View>
                  ) : (
                    <View style={[styles.badge, { backgroundColor: colors.accentBg }]}>
                      <Text style={[styles.badgeText, { color: colors.accentText }]}>
                        Unverified
                      </Text>
                    </View>
                  )}
                </View>
                <TextInput
                  style={[styles.input, styles.inputReadOnly]}
                  value={profile.email}
                  editable={false}
                />
                <Text style={styles.hint}>Email can't be changed here.</Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Phone number</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+20 1XX XXX XXXX"
                  placeholderTextColor={colors.placeholder}
                  keyboardType="phone-pad"
                  maxLength={30}
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={[styles.saveBtn, !canSave && { opacity: 0.5 }]}
              onPress={() => save.mutate()}
              disabled={!canSave}
            >
              {save.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveText}>Save changes</Text>
              )}
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: spacing.top,
    paddingHorizontal: spacing.page,
    paddingBottom: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: 'Outfit-Bold', fontSize: 22, color: colors.ink },
  empty: { fontFamily: 'Inter-Regular', color: colors.muted, textAlign: 'center', marginTop: 40 },
  body: { paddingHorizontal: spacing.page, paddingTop: 8, paddingBottom: 24, gap: 20 },
  avatarBlock: { alignItems: 'center', gap: 12, paddingTop: 4 },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: colors.surface,
  },
  avatarText: { fontFamily: 'Outfit-Bold', fontSize: 36, color: '#fff' },
  avatarBusy: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(14,22,51,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBtn: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: colors.bg,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRow: { flexDirection: 'row', gap: 8 },
  pill: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  pillText: { fontFamily: 'Inter-SemiBold', fontSize: 13 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 16,
  },
  field: { gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: colors.muted },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: radii.input,
    paddingHorizontal: 14,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  inputReadOnly: { borderColor: colors.border, backgroundColor: '#f6f4f0', color: colors.subtle },
  hint: { fontFamily: 'Inter-Regular', fontSize: 12, color: colors.subtle },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.badge,
  },
  badgeText: { fontFamily: 'Inter-SemiBold', fontSize: 11.5 },
  footer: { paddingHorizontal: spacing.page, paddingTop: 12, paddingBottom: 34 },
  saveBtn: {
    height: 54,
    borderRadius: radii.button,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { fontFamily: 'Outfit-Bold', fontSize: 16, color: '#fff' },
});
