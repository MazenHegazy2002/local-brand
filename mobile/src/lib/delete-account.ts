// In-app account deletion (required by Google Play and the App Store for every
// role that can sign in). Confirms, calls the API, then signs out.
import { Alert, Platform } from 'react-native';
import { api } from '@/lib/api';

type T = (key: string) => string;

export function confirmDeleteAccount(t: T, signOut: () => void) {
  // 400 carries a reason the user can act on (e.g. the last admin can't leave).
  const reason = (e: unknown) => {
    const err = e as { status?: number; message?: string };
    return err?.status === 400 && err.message ? t(err.message) : t('Please try again.');
  };
  const run = () => api.post('/api/account/delete', {}).then(() => signOut());

  // react-native-web's Alert ignores buttons, so use the browser dialogs there.
  if (Platform.OS === 'web') {
    if (
      window.confirm(t('Permanently delete your account and personal data? This cannot be undone.'))
    )
      run().catch(e => window.alert(`${t('Could not delete account')}\n${reason(e)}`));
    return;
  }
  Alert.alert(
    t('Delete account'),
    t('This permanently deletes your account and personal data. This cannot be undone.'),
    [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Delete'),
        style: 'destructive',
        onPress: () => run().catch(e => Alert.alert(t('Could not delete account'), reason(e))),
      },
    ]
  );
}
