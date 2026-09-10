// ============================================================================
// FAB.tsx - Botón Flotante de Acción (Floating Action Button)
// ----------------------------------------------------------------------------
// Botón circular grande de color azul primario con un "+" blanco centrado.
// Se coloca de forma absoluta abajo a la derecha de las listas (el contenedor
// padre debe tener position: relative para anclarlo correctamente).
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { AppColors } from '@/constants/theme';

interface FABProps {
  /** Acción al pulsar el botón. */
  onPress?: () => void;
}

export default function FAB({ onPress }: FABProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
      accessibilityLabel="Agregar">
      <Ionicons name="add" size={30} color="#FFFFFF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    // Sombra fuerte para que destaque sobre el contenido.
    elevation: 6,
    shadowColor: AppColors.primaryDark,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  pressed: {
    transform: [{ scale: 0.92 }],
  },
});
