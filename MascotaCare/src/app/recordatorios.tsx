// ============================================================================
// recordatorios.tsx - Pantalla Modal de Recordatorios
// ----------------------------------------------------------------------------
// Se abre como modal (desde la campana de cualquier pantalla). Muestra el
// título "Recordatorios" y la lista de tarjetas de recordatorio con su borde
// de color izquierdo y un checkbox para marcarlas como completadas.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ReminderCard from '@/components/ReminderCard';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import type { Recordatorio } from '@/types';

export default function RecordatoriosScreen() {
  const { recordatorios, tacharRecordatorio } = useAuth();

  // Ordena: pendientes primero, completados al final.
  const ordenados = [...recordatorios].sort(
    (a, b) => Number(a.completado) - Number(b.completado)
  );

  // Al tocar el checkbox, cambiamos el estado completado del recordatorio.
  const manejarToggle = (recordatorio: Recordatorio) => {
    tacharRecordatorio(recordatorio.id, !recordatorio.completado);
  };

  const pendientes = recordatorios.filter((r) => !r.completado).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Cabecera del modal con botón de cierre. */}
      <View style={styles.header}>
        <Text style={styles.title}>Recordatorios</Text>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
          <Ionicons name="close" size={24} color={AppColors.textSecondary} />
        </Pressable>
      </View>

      {/* Subtítulo informativo. */}
      <Text style={styles.subtitle}>
        Tienes {pendientes} recordatorio{pendientes !== 1 ? 's' : ''} pendiente
        {pendientes !== 1 ? 's' : ''}.
      </Text>

      {/* Lista de recordatorios. */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {ordenados.length === 0 ? (
          <Text style={styles.empty}>No tienes recordatorios.</Text>
        ) : (
          ordenados.map((r) => (
            <ReminderCard key={r.id} recordatorio={r} onToggle={manejarToggle} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: AppColors.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    paddingHorizontal: 20,
    paddingTop: 4,
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  empty: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginTop: 8,
  },
  pressed: {
    opacity: 0.7,
  },
});