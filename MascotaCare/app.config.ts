import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'MascotaCare',
  slug: config.slug ?? 'MascotaCare',
  android: { ...config.android, package: 'com.petcore.mascotacare' },
  plugins: [
    ...(config.plugins ?? []),
    // Solo el APK de prueba local accede a la API HTTP de la misma Wi-Fi.
    ...(process.env.APP_VARIANT === 'preview-local'
      ? [['expo-build-properties', { android: { usesCleartextTraffic: true } }] as [string, { android: { usesCleartextTraffic: boolean } }]]
      : []),
  ],
});
