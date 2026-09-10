import { Pressable, Text, View } from 'react-native';

export default function SaveFeedback({ guardando, error, mensaje, reintentar }: {
  guardando: boolean; error: string; mensaje: string; reintentar: () => void;
}) {
  return <View accessibilityLiveRegion="polite" style={{ gap: 8 }}>
    {guardando && <Text style={{ color: '#374151' }}>Guardando…</Text>}
    {!!error && <>
      <Text accessibilityRole="alert" style={{ color: '#B91C1C' }}>{error}</Text>
      <Pressable accessibilityRole="button" onPress={reintentar} disabled={guardando} style={{ padding: 12, backgroundColor: '#0369A1', borderRadius: 12 }}>
        <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Reintentar</Text>
      </Pressable>
    </>}
    {!!mensaje && <Text style={{ color: '#166534' }}>{mensaje}</Text>}
  </View>;
}
