import AnimatedPressable from '@/components/AnimatedPressable';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import PetScreen from '@/components/PetScreen';
import { AdaptiveColumns, layoutStyles } from '@/components/AdaptiveLayout';
import AppearanceSelector from '@/components/AppearanceSelector';
import LocalNotificationsCard from '@/components/LocalNotificationsCard';
import PermissionsPanel from '@/components/PermissionsPanel';
import PetHero from '@/components/PetHero';
import { useAppColors } from '@/context/AppearanceContext';
import type { AppPalette } from '@/constants/theme';

export default function ConfiguracionScreen() {
  const colors = useAppColors();
  const styles = createStyles(colors);
  const volver = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/perfil');
  };

  return <PetScreen style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
    <ScrollView contentContainerStyle={[styles.content, layoutStyles.form]}>
      <View style={styles.header}>
        <AnimatedPressable accessibilityRole="button" accessibilityLabel="Volver al perfil" onPress={volver}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Ionicons name="arrow-back" size={23} color={colors.text} />
        </AnimatedPressable>
        <Text accessibilityRole="header" style={styles.title}>Configuración</Text>
      </View>
      <PetHero eyebrow="PetCore a tu manera" title="Tus preferencias"
        description="Elige la apariencia de la app y gestiona los avisos y permisos de este dispositivo." />
      <AdaptiveColumns>
        <View style={layoutStyles.column}><AppearanceSelector /></View>
        <View style={layoutStyles.column}>
          <LocalNotificationsCard />
          <PermissionsPanel />
        </View>
      </AdaptiveColumns>
    </ScrollView>
  </PetScreen>;
}

const createStyles = (colors: AppPalette) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40, gap: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 23, fontWeight: '800', color: colors.text, flexShrink: 1 },
  pressed: { opacity: 0.7 },
});
