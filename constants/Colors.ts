import { Theme } from './Theme';

const tintColor = Theme.colors.primary;

export default {
  light: {
    text: Theme.colors.textPrimary,
    background: Theme.colors.background,
    tint: tintColor,
    tabIconDefault: Theme.colors.textMuted,
    tabIconSelected: Theme.colors.primaryGlow,
  },
  dark: {
    text: Theme.colors.textPrimary,
    background: Theme.colors.background,
    tint: tintColor,
    tabIconDefault: Theme.colors.textMuted,
    tabIconSelected: Theme.colors.primaryGlow,
  },
};
