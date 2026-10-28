import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CareAgenda from '@/components/CareAgenda';
import { useAppColors } from '@/context/AppearanceContext';
import { useAuth } from '@/context/AuthContext';
import { leerDestinoAviso, propietarioAvisos } from '@/utils/avisos-locales';

export default function CuidadoScreen() {
  const colors = useAppColors();
  const { clave, owner } = useLocalSearchParams<{ clave?: string; owner?: string }>();
  const { usuario, modoDemo } = useAuth();
  const actual = usuario ? propietarioAvisos(usuario.id, modoDemo) : '';
  const destino = leerDestinoAviso({ petcore: true, version: 1, owner, clave }, actual);
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView contentContainerStyle={{ padding: 20, gap: 18, width: '100%', maxWidth: 1000, alignSelf: 'center' }}>
      <View style={{ gap: 8 }}><Text style={{ fontSize: 23, fontWeight: '800', color: colors.text }}>Cuidado del aviso</Text>
        <Text style={{ color: colors.textSecondary, lineHeight: 21 }}>Consulta el estado actual y registra lo que hayas realizado.</Text></View>
      {destino ? <CareAgenda eventoClave={destino} initialFilter="Todos" /> : <Text style={{ color: colors.textSecondary }}>Este aviso no corresponde a tu sesión actual.</Text>}
      <Pressable accessibilityRole="button" onPress={() => router.replace('/citas')} style={{ minHeight: 48, padding: 14, borderRadius: 12, backgroundColor: colors.primaryDark }}><Text style={{ color: colors.onPrimary, fontWeight: '700', textAlign: 'center' }}>Ver agenda completa</Text></Pressable>
    </ScrollView>
  </SafeAreaView>;
}
