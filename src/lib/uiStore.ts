import { create } from 'zustand';

interface UIStore {
  isMobileMenuOpen: boolean;
  isSearchOpen: boolean;
  isCartOpen: boolean;
  activeModal: string | null;
  setMobileMenuOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setCartOpen: (open: boolean) => void;
  openModal: (id: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIStore>()(set => ({
  isMobileMenuOpen: false,
  isSearchOpen: false,
  isCartOpen: false,
  activeModal: null,

  setMobileMenuOpen: open => set({ isMobileMenuOpen: open }),
  setSearchOpen: open => set({ isSearchOpen: open }),
  setCartOpen: open => set({ isCartOpen: open }),
  openModal: id => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
}));
