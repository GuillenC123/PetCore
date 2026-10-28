import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Appearance, Platform } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { AppColors, DarkAppColors, type AppPalette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type AppearancePreference = 'light' | 'dark' | 'system';
export const APPEARANCE_KEY = 'petcore.appearance';
export function isAppearancePreference(value: unknown): value is AppearancePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}
const AppearanceContext = createContext({
  preference: 'system' as AppearancePreference, scheme: 'light' as 'light' | 'dark',
  colors: AppColors as AppPalette, ready: false, storageError: false,
  setPreference: (_value: AppearancePreference) => {},
});

/** Preferencia local del dispositivo, independiente de la sesión del usuario. */
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [preference, updatePreference] = useState<AppearancePreference>('system');
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const systemScheme = useColorScheme();
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(APPEARANCE_KEY).then((saved) => {
      if (active && isAppearancePreference(saved)) updatePreference(saved);
    }).catch(() => { if (active) setStorageError(true); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  const scheme = preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;
  const colors = scheme === 'dark' ? DarkAppColors : AppColors;
  useEffect(() => {
    if (!ready) return;
    // También adapta los controles nativos y los selectores de fecha.
    if (Platform.OS !== 'web') Appearance.setColorScheme(preference === 'system' ? 'auto' : preference);
    void SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
    if (Platform.OS === 'web') document.documentElement.style.colorScheme = scheme;
  }, [ready, preference, scheme, colors.background]);
  const value = useMemo(() => ({ preference, scheme, colors, ready, storageError,
    setPreference: (next: AppearancePreference) => {
      if (!ready) return;
      updatePreference(next);
      setStorageError(false);
      // Mantiene el orden si se cambia rápidamente entre varios modos.
      writes.current = writes.current.then(() => AsyncStorage.setItem(APPEARANCE_KEY, next))
        .catch(() => { setStorageError(true); });
    },
  }), [preference, scheme, colors, ready, storageError]);
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export const useAppearance = () => useContext(AppearanceContext);
export const useAppColors = () => useAppearance().colors;
