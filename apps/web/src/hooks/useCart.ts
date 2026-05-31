import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId?: string;
  nameSnapshot: string;
  nameArSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  imageUrl?: string;
}

interface CartStore {
  items: CartItem[];
  storeId: string | null;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  setStore: (storeId: string) => void;
  total: () => number;
  itemCount: () => number;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      storeId: null,

      setStore: (storeId) => {
        if (get().storeId && get().storeId !== storeId) {
          set({ items: [], storeId });
        } else {
          set({ storeId });
        }
      },

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.productId === item.productId && i.nameSnapshot === item.nameSnapshot,
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: i.quantity + 1 }
                  : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: 1 }] };
        }),

      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),

      updateQty: (productId, qty) =>
        set((state) => ({
          items:
            qty <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) =>
                  i.productId === productId ? { ...i, quantity: qty } : i,
                ),
        })),

      clearCart: () => set({ items: [], storeId: null }),

      total: () =>
        get().items.reduce((s, i) => s + i.priceSnapshot * i.quantity, 0),

      itemCount: () => get().items.reduce((s, i) => s + i.quantity, 0),
    }),
    { name: 'estlem-cart' },
  ),
);
