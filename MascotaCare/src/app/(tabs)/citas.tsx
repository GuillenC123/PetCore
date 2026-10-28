import { useAppColors } from '@/context/AppearanceContext';
import type { AppPalette } from '@/constants/theme';
import { layoutStyles } from '@/components/AdaptiveLayout';
// ============================================================================
// (tabs)/citas.tsx - Pantalla de Citas
// ----------------------------------------------------------------------------
// Muestra la lista de todas las citas médicas con sus colores de borde
// izquierdo y etiquetas de estado (Azul/Confirmado, Rojo/Pendiente,
// Verde/Programado). Incluye la cabecera general.
// ============================================================================

import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '@/components/AppHeader';
import CareAgenda from '@/components/CareAgenda';
import { useAhora } from '@/hooks/use-ahora';

export default function CitasScreen() {
  const AppColors = useAppColors();
  const styles = createStyles(AppColors);

  const { creada } = useLocalSearchParams<{ creada?: string }>();
  const ahora = useAhora();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, layoutStyles.page]}
        showsVerticalScrollIndicator={false}>
        {/* Cabecera general. */}
        <AppHeader onPressBell={() => router.push('/recordatorios')} />

        {/* Título y subtítulo. */}
        <View style={styles.hero}>
        <View style={styles.titleBlock}>
          <View style={styles.dateRow}><Ionicons name="calendar-outline" size={15} color={AppColors.accent} />
            <Text style={styles.date}>{new Date(ahora).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
          </View>
          <Text style={styles.title}>Agenda de cuidados</Text>
          <Text style={styles.subtitle}>Un lugar para organizar su bienestar, día a día.</Text>
        </View>
        <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Añadir visita veterinaria" style={({ pressed }) => [styles.button, pressed && styles.pressed]} onPress={() => router.push('/nueva-cita')}>
          <Ionicons name="add" size={20} color={AppColors.onPrimary} /><Text style={styles.buttonText}>Nueva visita</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={({ pressed }) => [styles.button, styles.secondary, pressed && styles.pressed]} onPress={() => router.push('/recordatorios')}>
          <Ionicons name="notifications-outline" size={18} color={AppColors.accent} /><Text style={[styles.buttonText, styles.secondaryText]}>Recordatorios</Text>
        </Pressable>
        </View>
        </View>

        {/* Lista de citas (cada una con su borde y badge de estado). */}
        <View style={styles.list}>
          <CareAgenda key={creada ?? 'agenda'} initialFilter={creada === '1' ? 'Todos' : 'Hoy'} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (AppColors: AppPalette) => (StyleSheet.create({
  hero: { gap: 20, paddingBottom: 4 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  date: { fontSize: 12, fontWeight: '600', color: AppColors.accent, flexShrink: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  button: { minHeight: 48, flexGrow: 1, flexBasis: 145, paddingHorizontal: 16, paddingVertical: 13, borderRadius: 13, backgroundColor: AppColors.primaryDark, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: AppColors.primaryDark },
  buttonText: { fontSize: 14, fontWeight: '700', color: AppColors.onPrimary, flexShrink: 1 },
  secondary: { backgroundColor: AppColors.surface, borderColor: AppColors.border }, secondaryText: { color: AppColors.accent },
  pressed: { opacity: 0.75 },
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
}));
