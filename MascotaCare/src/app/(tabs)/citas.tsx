import { layoutStyles } from '@/components/AdaptiveLayout';
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
import CareAgenda from '@/components/CareAgenda';
import { AppColors } from '@/constants/theme';

export default function CitasScreen() {
  const { creada } = useLocalSearchParams<{ creada?: string }>();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, layoutStyles.page]}
        showsVerticalScrollIndicator={false}>
        {/* Cabecera general. */}
        <AppHeader onPressBell={() => router.push('/recordatorios')} />

        {/* Título y subtítulo. */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Agenda de cuidados</Text>
          <Text style={styles.subtitle}>Visitas, medicamentos y recordatorios en un solo lugar.</Text>
        </View>
        <Pressable accessibilityRole="button" style={styles.button} onPress={() => router.push('/nueva-cita')}>
          <Text style={styles.buttonText}>Añadir visita veterinaria</Text>
        </Pressable>

        {/* Lista de citas (cada una con su borde y badge de estado). */}
        <View style={styles.list}>
          <CareAgenda key={creada ?? 'agenda'} initialFilter={creada === '1' ? 'Todos' : 'Hoy'} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  button: { padding: 16, borderRadius: 16, backgroundColor: '#0369A1', alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
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
