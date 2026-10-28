import { useAppColors } from '@/context/AppearanceContext';
import { Pressable, Text, View } from 'react-native';

export default function SaveFeedback({ guardando, error, mensaje, reintentar }: {
  guardando: boolean; error: string; mensaje: string; reintentar: () => void;
}) {
  const AppColors = useAppColors();


  return <View accessibilityLiveRegion="polite" style={{ gap: 8 }}>
    {guardando && <Text style={{ color: AppColors.textSecondary }}>Guardando…</Text>}
    {!!error && <>
      <Text accessibilityRole="alert" style={{ color: AppColors.danger }}>{error}</Text>
      <Pressable accessibilityRole="button" onPress={reintentar} disabled={guardando} style={{ padding: 12, backgroundColor: AppColors.primaryDark, borderRadius: 12 }}>
        <Text style={{ color: AppColors.onPrimary, fontWeight: '700' }}>Reintentar</Text>
      </Pressable>
    </>}
    {!!mensaje && <Text style={{ color: AppColors.success }}>{mensaje}</Text>}
  </View>;
}
