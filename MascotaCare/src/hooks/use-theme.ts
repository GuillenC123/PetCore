/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useAppearance } from '@/context/AppearanceContext';

export function useTheme() {
  const { scheme } = useAppearance();
  const theme = scheme === 'dark' ? 'dark' : 'light';

  return Colors[theme];
}
