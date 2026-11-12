import { Platform } from 'react-native';

// Web client ID (the server checks tokens are issued for it) and the iOS client ID.
const WEB_CLIENT_ID = '25071648810-m6m51eu3agfrj6bid4bichbuvropf84e.apps.googleusercontent.com';
const IOS_CLIENT_ID = '25071648810-i07tvl36fn9hcj4nnvumh90nemh6f37p.apps.googleusercontent.com';

let configured = false;

/** Opens Google's account picker and returns an ID token, or null if the user cancelled. */
export async function getGoogleIdToken(): Promise<string | null> {
  // Loaded lazily so a build without the native module (e.g. web) doesn't crash on import.
  const { GoogleSignin, isSuccessResponse } =
    await import('@react-native-google-signin/google-signin');
  if (!configured) {
    GoogleSignin.configure({ webClientId: WEB_CLIENT_ID, iosClientId: IOS_CLIENT_ID });
    configured = true;
  }
  if (Platform.OS === 'android')
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  await GoogleSignin.signOut().catch(() => {}); // always show the account picker
  const res = await GoogleSignin.signIn();
  if (!isSuccessResponse(res)) return null;
  return res.data.idToken ?? null;
}
