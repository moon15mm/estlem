export const colors = {
  primary: '#1B4F72',
  primaryLight: '#2E86C1',
  primaryDark: '#154360',
  accent: '#1ABC9C',
  accentLight: '#48C9B0',

  background: '#FFFFFF',
  backgroundSecondary: '#F5F7FA',
  surface: '#FFFFFF',

  foreground: '#1B1B1B',
  textPrimary: '#1B1B1B',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textOnPrimary: '#FFFFFF',

  border: '#E2E8F0',
  borderLight: '#F1F5F9',

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
