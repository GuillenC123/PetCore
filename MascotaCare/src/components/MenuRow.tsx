// ============================================================================
// MenuRow.tsx - Fila de opción del menú (pantalla de Perfil)
// ----------------------------------------------------------------------------
// Una fila de la lista vertical de opciones del perfil:
//   * Izquierda : ícono dentro de un círculo azul claro.
//   * Centro    : texto de la opción.
//   * Derecha   : chevron (flecha) a la derecha.
// Está envuelta en un contenedor blanco redondeado.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';

// Tipos de opción del menú (círculo e ícono asociados).
export type MenuOptionType = 'edit' | 'notifications' | 'help' | 'logout';

interface MenuRowProps {
  /** Texto de la opción. */
  label: string;
  /** Tipo de opción que determina el ícono y los colores del círculo. */
  tipo: MenuOptionType;
  /** Acción al pulsar la fila. */
  onPress?: () => void;
}

// Configuración visual de cada tipo de opción.
const TIPO_CONFIG: Record<MenuOptionType, { icon: IconName; color: string; bg: string }> = {
  edit: { icon: 'create-outline', color: AppColors.primaryDark, bg: AppColors.infoSoft },
  notifications: {
    icon: 'notifications-outline',
    color: AppColors.primaryDark,
    bg: AppColors.infoSoft,
  },
  help: { icon: 'help-circle-outline', color: AppColors.primaryDark, bg: AppColors.infoSoft },
  logout: { icon: 'log-out-outline', color: AppColors.danger, bg: AppColors.dangerSoft },
};

// Tipo de nombre de ícono (lo exportamos para reutilizarlo abajo).
type IconName = keyof typeof Ionicons.glyphMap;

export default function MenuRow({ label, tipo, onPress }: MenuRowProps) {
  const config = TIPO_CONFIG[tipo];

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {/* Círculo azul claro con el ícono de la opción. */}
      <View style={[styles.circle, { backgroundColor: config.bg }]}>
        <Ionicons name={config.icon} size={20} color={config.color} />
      </View>

      {/* Texto de la opción ocupando el espacio central. */}
      <Text style={[styles.label, tipo === 'logout' && { color: AppColors.danger }]}>
        {label}
      </Text>

      {/* Flecha hacia la derecha. */}
      <Ionicons name="chevron-forward" size={18} color={AppColors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
    // Sombra suave.
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.text,
  },
  pressed: {
    opacity: 0.8,
  },
});