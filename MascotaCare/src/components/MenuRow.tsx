import AnimatedPressable from '@/components/AnimatedPressable';
import { useAppColors } from '@/context/AppearanceContext';
import type { AppPalette } from '@/constants/theme';
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
import { StyleSheet, Text, View } from 'react-native';


// Tipos de opción del menú (círculo e ícono asociados).
export type MenuOptionType = 'edit' | 'settings' | 'help' | 'logout';

interface MenuRowProps {
  /** Texto de la opción. */
  label: string;
  /** Tipo de opción que determina el ícono y los colores del círculo. */
  tipo: MenuOptionType;
  /** Acción al pulsar la fila. */
  onPress?: () => void;
}

// Configuración visual de cada tipo de opción.
const createTipoConfig = (AppColors: AppPalette): Record<MenuOptionType, { icon: IconName; color: string; bg: string }> => ({
  edit: { icon: 'create-outline', color: AppColors.accent, bg: AppColors.infoSoft },
  settings: {
    icon: 'settings-outline',
    color: AppColors.accent,
    bg: AppColors.infoSoft,
  },
  help: { icon: 'help-circle-outline', color: AppColors.accent, bg: AppColors.infoSoft },
  logout: { icon: 'log-out-outline', color: AppColors.danger, bg: AppColors.dangerSoft },
});

// Tipo de nombre de ícono (lo exportamos para reutilizarlo abajo).
type IconName = keyof typeof Ionicons.glyphMap;

export default function MenuRow({ label, tipo, onPress }: MenuRowProps) {
  const AppColors = useAppColors();
  const TIPO_CONFIG = createTipoConfig(AppColors);
  const styles = createStyles(AppColors);

  const config = TIPO_CONFIG[tipo];

  return (
    <AnimatedPressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
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
    </AnimatedPressable>
  );
}

const createStyles = (AppColors: AppPalette) => (StyleSheet.create({
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
}));
