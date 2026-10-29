/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Paleta de colores del sistema de diseño de MascotaCare.
 * - primary: verde azulado usado en botones, íconos y enlaces activos.
 * - status: colores semánticos para estados (éxito, alerta, información).
 * - AppColors define el modo claro; useAppColors selecciona la paleta activa.
 */
export const AppColors = {
  accent: "#186B65", onPrimary: "#FFFFFF", border: "#DFE7E1",
  surfaceMuted: "#F0F4EF", warning: "#92400E", warningSoft: "#FFFBEB",
  purple: "#6D28D9", purpleSoft: "#F0EBFA", teal: "#176C60", tealSoft: "#E1F2E9",
  orange: "#9A3412", orangeSoft: "#FFF0DF",
  /** Verde azulado de la marca. */
  primary: '#186B65',
  /** Color para botones sólidos. */
  primaryDark: '#186B65',
  /** Fondo muy claro para superficies y tarjetas (blanco). */
  surface: '#FFFFFF',
  /** Fondo general de la app (marfil suave). */
  background: '#F7F8F2',
  /** Texto principal. */
  text: '#213B38',
  /** Texto secundario (gris). */
  textSecondary: '#536962',
  /** Gris claro para íconos y líneas separadoras. */
  textMuted: '#D1D5DB',
  /** Verde de éxito (Saludable / Programado). */
  success: '#166534',
  /** Fondo claro del verde de éxito (badge). */
  successSoft: '#DCFCE7',
  /** Color de información (Confirmado). */
  info: '#186B65',
  /** Fondo claro de información (badge). */
  infoSoft: '#E5F2ED',
  /** Rojo de alerta (Vacuna pendiente / Pendiente). */
  danger: '#B91C1C',
  /** Fondo claro del rojo de alerta (badge). */
  dangerSoft: '#FEE2E2',
  /** Verde oscuro para el borde de recordatorios prioritarios. */
  successDark: '#15803D',
} as const;

/** Paleta semántica compartida por pantallas y controles. */
export type AppPalette = { [K in keyof typeof AppColors]: string };
export const DarkAppColors: AppPalette = {
  primary: '#186B65', primaryDark: '#186B65', accent: '#8DDBCB', onPrimary: '#FFFFFF',
  surface: '#192D2C', background: '#102020', surfaceMuted: '#233B38', border: '#36514C',
  text: '#F0F7F3', textSecondary: '#BCCFC8', textMuted: '#8BA79E',
  success: '#86EFAC', successSoft: '#153D2C', successDark: '#4ADE80',
  info: '#8DDBCB', infoSoft: '#203F39', danger: '#FCA5A5', dangerSoft: '#47242F',
  warning: '#FCD34D', warningSoft: '#41351C', purple: '#C4B5FD', purpleSoft: '#342750',
  teal: '#5EEAD4', tealSoft: '#153F3D', orange: '#FDBA74', orangeSoft: '#482D20',
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
