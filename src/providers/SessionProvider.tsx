'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';
import { useCartStore } from '@/lib/cartStore';

function CartSessionSyncer() {
  const { status } = useSession();
  const previousStatus = useRef(status);

  useEffect(() => {
    if (previousStatus.current === 'authenticated' && status === 'unauthenticated') {
      useCartStore.getState().clearCart();
    }
    previousStatus.current = status;
  }, [status]);

  return null;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CartSessionSyncer />
      {children}
    </SessionProvider>
  );
}
