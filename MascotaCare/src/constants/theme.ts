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
 * - primary: azul claro/celeste usado en botones, íconos y enlaces activos.
 * - status: colores semánticos para estados (éxito, alerta, información).
 * - Estos valores son fijos (no dependen del modo claro/oscuro) y se importan
 *   directamente en los componentes para mantener una identidad coherente.
 */
export const AppColors = {
  /** Azul primario / celeste de acento. */
  primary: '#38BDF8',
  /** Variante más saturada del azul (para contrastes y botones sólidos). */
  primaryDark: '#0EA5E9',
  /** Fondo muy claro para superficies y tarjetas (blanco). */
  surface: '#FFFFFF',
  /** Fondo general de la app (gris muy claro). */
  background: '#F4F6F9',
  /** Texto principal. */
  text: '#111827',
  /** Texto secundario (gris). */
  textSecondary: '#6B7280',
  /** Gris claro para íconos y líneas separadoras. */
  textMuted: '#D1D5DB',
  /** Verde de éxito (Saludable / Programado). */
  success: '#16A34A',
  /** Fondo claro del verde de éxito (badge). */
  successSoft: '#DCFCE7',
  /** Azul de información (Confirmado). */
  info: '#0EA5E9',
  /** Fondo claro del azul de información (badge). */
  infoSoft: '#E0F2FE',
  /** Rojo de alerta (Vacuna pendiente / Pendiente). */
  danger: '#EF4444',
  /** Fondo claro del rojo de alerta (badge). */
  dangerSoft: '#FEE2E2',
  /** Verde oscuro para el borde de recordatorios prioritarios. */
  successDark: '#15803D',
} as const;

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
