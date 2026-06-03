import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId?: string;
  nameSnapshot: string;
  nameArSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  imageUrl?: string;
  isFreeText?: boolean; // true = typed by customer, not from catalog
}

interface CartStore {
  items: CartItem[];
  storeId: string | null;
  freeTextNotes: string; // raw text from free-text input
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  addFreeTextItems: (items: CartItem[], rawText: string) => void;
  removeItem: (key: string) => void;
  updateQty: (key: string, qty: number) => void;
  clearCart: () => void;
  setStore: (storeId: string) => void;
  total: () => number;
  itemCount: () => number;
  hasCatalogItems: () => boolean;
  hasFreeTextItems: () => boolean;
  getItemKey: (item: CartItem) => string;
}

function itemKey(item: CartItem): string {
  return item.productId ?? `free_${item.nameSnapshot}`;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      storeId: null,
      freeTextNotes: '',

      setStore: (storeId) => {
        if (get().storeId && get().storeId !== storeId) {
          set({ items: [], storeId, freeTextNotes: '' });
        } else {
          set({ storeId });
        }
      },

      addItem: (item) =>
        set((state) => {
          const key = item.productId ?? `free_${item.nameSnapshot}`;
          const existing = state.items.find((i) => itemKey(i) === key);
          if (existing) {
            return {
              items: state.items.map((i) =>
                itemKey(i) === key ? { ...i, quantity: i.quantity + 1 } : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: 1 }] };
        }),

      addFreeTextItems: (newItems, rawText) =>
        set((state) => {
          const merged = [...state.items];
          for (const item of newItems) {
            const key = itemKey(item);
            const idx = merged.findIndex((i) => itemKey(i) === key);
            if (idx >= 0) {
              merged[idx] = { ...merged[idx], quantity: merged[idx].quantity + item.quantity };
            } else {
              merged.push(item);
            }
          }
          return {
            items: merged,
            freeTextNotes: state.freeTextNotes
              ? `${state.freeTextNotes}\n${rawText}`
              : rawText,
          };
        }),

      removeItem: (key) =>
        set((state) => ({
          items: state.items.filter((i) => itemKey(i) !== key),
        })),

      updateQty: (key, qty) =>
        set((state) => ({
          items:
            qty <= 0
              ? state.items.filter((i) => itemKey(i) !== key)
              : state.items.map((i) =>
                  itemKey(i) === key ? { ...i, quantity: qty } : i,
                ),
        })),

      clearCart: () => set({ items: [], storeId: null, freeTextNotes: '' }),

      total: () =>
        get().items.reduce((s, i) => s + i.priceSnapshot * i.quantity, 0),

      itemCount: () => get().items.reduce((s, i) => s + i.quantity, 0),

      hasCatalogItems: () => get().items.some((i) => !i.isFreeText),
      hasFreeTextItems: () => get().items.some((i) => i.isFreeText),

      getItemKey: (item) => itemKey(item),
    }),
    { name: 'estlem-cart' },
  ),
);
