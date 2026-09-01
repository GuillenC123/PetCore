// ============================================================================
// AppHeader.tsx - Cabecera general de las pantallas principales
// ----------------------------------------------------------------------------
// Fila superior con el logo ("PetCore" con un ícono de huella a la izquierda)
// y, a la derecha, un botón de campana que abre el modal de Recordatorios.
// Se reutiliza en Inicio, Mascotas, Citas y Perfil.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';

interface AppHeaderProps {
  /** Callback que se ejecuta al tocar la campana (abre Recordatorios). */
  onPressBell?: () => void;
}

export default function AppHeader({ onPressBell }: AppHeaderProps) {
  return (
    <View style={styles.container}>
      {/* ---- Marca: huella + "PetCore" ---- */}
      <View style={styles.brand}>
        <Ionicons name="paw" size={22} color={AppColors.primaryDark} />
        <Text style={styles.brandText}>PetCore</Text>
      </View>

      {/* ---- Botón campana (abre los recordatorios) ---- */}
      <Pressable
        onPress={onPressBell}
        style={({ pressed }) => [styles.bellButton, pressed && styles.pressed]}
        accessibilityLabel="Recordatorios">
        <Ionicons name="notifications-outline" size={24} color={AppColors.textSecondary} />
        {/* Punto de notificación para llamar la atención. */}
        <View style={styles.dot} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandText: {
    fontSize: 18,
    fontWeight: '800',
    color: AppColors.text,
  },
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: AppColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    // Sombra suave.
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  dot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AppColors.danger,
  },
  pressed: {
    opacity: 0.7,
  },
});