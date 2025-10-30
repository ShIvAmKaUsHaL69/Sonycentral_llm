import { create } from 'zustand';

export type Notification = {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
  table?: string;
  timestamp: Date;
};

export type SyncProgress = {
  active: boolean;
  percent: number;
  currentTable: string;
  message: string;
};

type NotificationStore = {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  clearNotifications: () => void;
  syncProgress: SyncProgress | null;
  setSyncProgress: (progress: SyncProgress | null) => void;
};

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        { id: Date.now(), ...notification }
      ]
    })),
  clearNotifications: () => set({ notifications: [] }),
  syncProgress: null,
  setSyncProgress: (progress) => set({ syncProgress: progress }),
})); 