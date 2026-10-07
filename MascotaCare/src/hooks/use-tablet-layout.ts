import { useWindowDimensions } from 'react-native';

export function useTabletLayout() {
  const { width, fontScale } = useWindowDimensions();
  // Width remains stable when the keyboard opens in landscape.
  return { sidebar: width >= 1000 && fontScale <= 1.5 };
}
