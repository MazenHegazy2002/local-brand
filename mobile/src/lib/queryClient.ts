import { AppState, Platform } from 'react-native';
import { QueryClient, focusManager } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

// React Query only knows about browser focus; on a phone, coming back to the app
// counts as focus so order statuses, new sellers etc. refresh instead of going stale.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', state => focusManager.setFocused(state === 'active'));
}
