import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface SavedOrder {
  id: string;
  orderNumber?: string;
  storeName?: string;
  total?: number;
  createdAt: string;
}

interface OrdersStore {
  orders: SavedOrder[];
  addOrder: (order: SavedOrder) => void;
  removeOrder: (id: string) => void;
  clearOrders: () => void;
}

export const useOrders = create<OrdersStore>()(
  persist(
    (set, get) => ({
      orders: [],

      addOrder: (order) => {
        const next = [order, ...get().orders.filter((item) => item.id !== order.id)];
        set({ orders: next.slice(0, 30) });
      },

      removeOrder: (id) => {
        set({ orders: get().orders.filter((order) => order.id !== id) });
      },

      clearOrders: () => set({ orders: [] }),
    }),
    {
      name: 'estlem-orders',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
