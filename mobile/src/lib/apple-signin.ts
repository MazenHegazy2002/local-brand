import { Platform } from 'react-native';

/** True on iPhones that support Sign in with Apple. */
export async function appleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  const AppleAuth = await import('expo-apple-authentication');
  return AppleAuth.isAvailableAsync();
}

/** Opens the Apple sheet and returns the identity token (plus the name, which Apple only sends the first time), or null if cancelled. */
export async function getAppleIdentity(): Promise<{
  identityToken: string;
  name: string | null;
} | null> {
  const AppleAuth = await import('expo-apple-authentication');
  try {
    const cred = await AppleAuth.signInAsync({
      requestedScopes: [
        AppleAuth.AppleAuthenticationScope.FULL_NAME,
        AppleAuth.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!cred.identityToken) return null;
    const n = cred.fullName;
    const name = n ? [n.givenName, n.familyName].filter(Boolean).join(' ') || null : null;
    return { identityToken: cred.identityToken, name };
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null;
    throw e;
  }
}
