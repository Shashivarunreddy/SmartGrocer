// BigBasket Brand Identity Palette
const primaryGreen = '#84C225'; // Signature BigBasket leafy green
const primaryGreenDark = '#689F38';
const accentRed = '#E23744'; // BigBasket promo/tag red
const accentYellow = '#F59E0B';

export const BrandColors = {
  primary: primaryGreen,
  primaryDark: primaryGreenDark,
  primaryLight: '#F1F8E9',
  primaryMuted: '#E8F5E9',
  accentRed: accentRed,
  accentRedLight: '#FEE2E2',
  accentYellow: accentYellow,
  dark: '#1F2937',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  surface: '#FFFFFF',
  surfaceSecondary: '#F9FAFB',
  badgeGreen: '#E8F5E9',
  badgeGreenText: '#2E7D32',
};

export default {
  light: {
    text: '#1F2937',
    textSecondary: '#6B7280',
    background: '#F8FAF6',
    card: '#FFFFFF',
    tint: primaryGreenDark,
    tabIconDefault: '#9CA3AF',
    tabIconSelected: primaryGreenDark,
    primary: primaryGreen,
    primaryDark: primaryGreenDark,
    primaryLight: '#F1F8E9',
    accent: accentRed,
    border: '#E5E7EB',
    warning: accentYellow,
  },
  dark: {
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    background: '#111827',
    card: '#1F2937',
    tint: primaryGreen,
    tabIconDefault: '#6B7280',
    tabIconSelected: primaryGreen,
    primary: primaryGreen,
    primaryDark: primaryGreenDark,
    primaryLight: '#1B2E15',
    accent: accentRed,
    border: '#374151',
    warning: accentYellow,
  },
};
