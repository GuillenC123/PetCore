import AnimatedPressable from '@/components/AnimatedPressable';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { useAppearance, type AppearancePreference } from '@/context/AppearanceContext';

const OPTIONS: { value: AppearancePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'light', label: 'Claro', icon: 'sunny-outline' },
  { value: 'dark', label: 'Oscuro', icon: 'moon-outline' },
  { value: 'system', label: 'Automático', icon: 'phone-portrait-outline' },
];

export default function AppearanceSelector() {
  const { preference, setPreference, colors, ready, storageError } = useAppearance();
  return <View style={{ padding: 18, gap: 12, borderRadius: 16, backgroundColor: colors.surface }}>
    <Text accessibilityRole="header" style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Apariencia</Text>
    <Text style={{ fontSize: 13, lineHeight: 20, color: colors.textSecondary }}>Elige cómo quieres ver PetCore. Automático sigue el tema de tu dispositivo.</Text>
    <View accessibilityRole="radiogroup" accessibilityLabel="Modo de apariencia" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {OPTIONS.map(({ value, label, icon }) => {
        const selected = preference === value;
        return <AnimatedPressable key={value} accessibilityRole="radio" accessibilityLabel={`Modo ${label.toLowerCase()}`}
          accessibilityState={{ checked: selected, disabled: !ready }} disabled={!ready} onPress={() => setPreference(value)}
          style={{ flexGrow: 1, flexBasis: 85, minHeight: 76, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12,
            borderRadius: 12, borderWidth: 2, borderColor: selected ? colors.accent : colors.border, backgroundColor: selected ? colors.infoSoft : colors.surface }}>
          <Ionicons name={icon} size={22} color={selected ? colors.accent : colors.textSecondary} />
          <Text style={{ fontSize: 13, fontWeight: selected ? '700' : '500', color: selected ? colors.accent : colors.text }}>{label}</Text>
        </AnimatedPressable>;
      })}
    </View>
    {storageError && <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 13 }}>El modo se aplicó, pero no se pudo guardar en este dispositivo. Vuelve a seleccionarlo para reintentar.</Text>}
  </View>;
}
