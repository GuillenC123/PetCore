// ============================================================================
// (tabs)/citas.tsx - Pantalla de Citas
// ----------------------------------------------------------------------------
// Muestra la lista de todas las citas médicas con sus colores de borde
// izquierdo y etiquetas de estado (Azul/Confirmado, Rojo/Pendiente,
// Verde/Programado). Incluye la cabecera general.
// ============================================================================

import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '@/components/AppHeader';
import AppointmentCard from '@/components/AppointmentCard';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function CitasScreen() {
  const { citas } = useAuth();

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
          <Text style={styles.subtitle}>Gestiona las visitas veterinarias.</Text>
        </View>

        {/* Lista de citas (cada una con su borde y badge de estado). */}
        <View style={styles.list}>
          {citas.length === 0 ? (
            <Text style={styles.empty}>No tienes citas programadas.</Text>
          ) : (
            citas.map((c) => <AppointmentCard key={c.id} cita={c} />)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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