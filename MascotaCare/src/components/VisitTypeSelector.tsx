import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import AnimatedPressable from '@/components/AnimatedPressable';
import { useAppColors } from '@/context/AppearanceContext';
import type { AppPalette } from '@/constants/theme';
import type { TipoVisita } from '@/types';
import { TIPOS_VISITA } from '@/utils/tipos-visita';

const ICONOS: Record<TipoVisita, keyof typeof Ionicons.glyphMap> = {
  consulta_malestar: 'medical-outline',
  control_preventivo: 'heart-outline',
  vacunacion: 'shield-checkmark-outline',
  desparasitacion: 'bug-outline',
  seguimiento: 'clipboard-outline',
  otro: 'ellipsis-horizontal-circle-outline',
};

interface VisitTypeSelectorProps {
  value: TipoVisita | null;
  onChange: (value: TipoVisita) => void;
  disabled?: boolean;
  error?: string;
}

export default function VisitTypeSelector({ value, onChange, disabled = false, error }: VisitTypeSelectorProps) {
  const colors = useAppColors();
  const styles = createStyles(colors);
  return <View style={styles.section}>
    <Text style={styles.label}>¿Para qué es la visita?</Text>
    <View accessibilityRole="radiogroup" accessibilityLabel="Tipo de visita" style={styles.options}>
      {TIPOS_VISITA.map(({ value: tipo, label }) => {
        const selected = value === tipo;
        return <AnimatedPressable key={tipo} accessibilityRole="radio" accessibilityLabel={label}
          accessibilityState={{ checked: selected, disabled }} disabled={disabled}
          onPress={() => onChange(tipo)}
          style={({ pressed }) => [styles.option, selected && styles.selected, disabled && styles.disabled, pressed && styles.pressed]}>
          <Ionicons name={ICONOS[tipo]} size={21} color={selected ? colors.accent : colors.textSecondary} />
          <Text style={[styles.optionText, selected && styles.selectedText]}>{label}</Text>
          {selected && <Ionicons name="checkmark-circle" size={18} color={colors.accent} />}
        </AnimatedPressable>;
      })}
    </View>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  </View>;
}

const createStyles = (colors: AppPalette) => StyleSheet.create({
  section: { gap: 10 },
  label: { fontSize: 16, fontWeight: '700', color: colors.text },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  option: { flexBasis: 210, flexGrow: 1, minWidth: 0, minHeight: 62, padding: 14, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  selected: { borderColor: colors.accent, backgroundColor: colors.infoSoft },
  optionText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.text, fontWeight: '500' },
  selectedText: { color: colors.accent, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.8 },
  error: { fontSize: 14, color: colors.danger },
});
