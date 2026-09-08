// ============================================================================
// (tabs)/citas.tsx - Pantalla de Citas
// ----------------------------------------------------------------------------
// Muestra la lista de todas las citas médicas con sus colores de borde
// izquierdo y etiquetas de estado (Azul/Confirmado, Rojo/Pendiente,
// Verde/Programado). Incluye la cabecera general.
// ============================================================================

import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '@/components/AppHeader';
import AppointmentCard from '@/components/AppointmentCard';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { obtenerProximasCitas } from '@/utils/citas';
import { useAhora } from '@/hooks/use-ahora';

export default function CitasScreen() {
  const { citas } = useAuth();
  const { creada } = useLocalSearchParams<{ creada?: string }>();
  const ahora = useAhora();
  const proximas = obtenerProximasCitas(citas, ahora);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* Cabecera general. */}
        <AppHeader onPressBell={() => router.push('/recordatorios')} />

        {/* Título y subtítulo. */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Próximas Citas</Text>
          <Text style={styles.subtitle}>Recuerda cuándo llevar a tus mascotas a la veterinaria.</Text>
        </View>
        {creada === '1' && (
          <View style={styles.notice}>
            <Text accessibilityRole="alert" style={styles.subtitle}>Recordatorio guardado para esta sesión. También puedes verlo en la campana.</Text>
            <Pressable accessibilityRole="button" onPress={() => router.setParams({ creada: '' })}>
              <Text style={styles.dismiss}>Entendido</Text>
            </Pressable>
          </View>
        )}
        <Pressable accessibilityRole="button" style={styles.button} onPress={() => router.push('/nueva-cita')}>
          <Text style={styles.buttonText}>Añadir visita veterinaria</Text>
        </Pressable>

        {/* Lista de citas (cada una con su borde y badge de estado). */}
        <View style={styles.list}>
          {proximas.length === 0 ? (
            <Text style={styles.empty}>No tienes citas programadas.</Text>
          ) : (
            proximas.map((c) => <AppointmentCard key={c.id} cita={c} />)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  button: { padding: 16, borderRadius: 16, backgroundColor: '#0369A1', alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  notice: { padding: 16, borderRadius: 14, backgroundColor: AppColors.successSoft, gap: 8 },
  dismiss: { color: '#0369A1', fontWeight: '700', paddingVertical: 8 },
  safe: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  titleBlock: {
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: AppColors.text,
  },
  subtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  list: {
    gap: 12,
  },
  empty: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginTop: 8,
  },
});
