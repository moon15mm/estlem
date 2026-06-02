import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CartItem {
  productId: string;
  name: string;
  nameAr: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

interface CartStore {
  storeId: string | null;
  tenantId: string | null;
  parkingSpotId: string | null;
  items: CartItem[];
  setStore: (storeId: string, tenantId: string, parkingSpotId?: string | null) => void;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: () => number;
  itemCount: () => number;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      storeId: null,
      tenantId: null,
      parkingSpotId: null,
      items: [],

      setStore: (storeId, tenantId, parkingSpotId = null) => {
        if (get().storeId !== storeId) set({ storeId, tenantId, parkingSpotId, items: [] });
        else set({ tenantId, parkingSpotId });
      },

      addItem: (item) => {
        const items = [...get().items];
        const idx = items.findIndex((i) => i.productId === item.productId);
        if (idx >= 0) items[idx].quantity += 1;
        else items.push({ ...item, quantity: 1 });
        set({ items });
      },

      removeItem: (productId) =>
        set({ items: get().items.filter((i) => i.productId !== productId) }),

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) return get().removeItem(productId);
        set({
          items: get().items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i,
          ),
        });
      },

      clearCart: () => set({ items: [], parkingSpotId: null }),

      total: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),

      itemCount: () => get().items.reduce((s, i) => s + i.quantity, 0),
    }),
    {
      name: 'estlem-cart',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
