// ============================================================================
// StatCard.tsx - Tarjeta de Estadística (pantalla de Perfil)
// ----------------------------------------------------------------------------
// Pequeña tarjeta cuadrada blanca que muestra un número grande en azul y un
// rótulo debajo (ej. "2 / Mascotas", "3 / Citas", "1 / Pendiente").
// ============================================================================

import { StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';

interface StatCardProps {
  /** Valor numérico grande que se muestra en azul. */
  valor: number | string;
  /** Etiqueta descriptiva debajo del número. */
  label: string;
}

export default function StatCard({ valor, label }: StatCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.valor}>{valor}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: AppColors.surface,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 6,
    // Sombra suave.
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  valor: {
    fontSize: 28,
    fontWeight: '800',
    color: AppColors.primaryDark,
  },
  label: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
});