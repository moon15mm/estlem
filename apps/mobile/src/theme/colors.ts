export const colors = {
  primary: '#0F4C5C',
  primaryLight: '#2C7A7B',
  primaryDark: '#083A46',
  accent: '#F59E0B',
  accentLight: '#FDE68A',

  background: '#F7F8F5',
  backgroundSecondary: '#EEF3EF',
  surface: '#FFFFFF',

  foreground: '#15211F',
  textPrimary: '#15211F',
  textSecondary: '#5F6F6B',
  textMuted: '#96A19E',
  textOnPrimary: '#FFFFFF',

  border: '#DDE5E1',
  borderLight: '#E9EFEC',

  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  destructive: '#DC2626',
  destructiveLight: '#FEE2E2',

  skeleton: '#E2E8F0',

  // Order status colors
  statusNew: '#1B4F72',
  statusAccepted: '#2E86C1',
  statusPreparing: '#D97706',
  statusReady: '#16A34A',
  statusDelivered: '#059669',
  statusCancelled: '#DC2626',
} as const;

export type ColorKey = keyof typeof colors;
