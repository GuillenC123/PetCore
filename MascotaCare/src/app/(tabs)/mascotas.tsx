import AnimatedPressable from '@/components/AnimatedPressable';
import AnimatedSection from '@/components/AnimatedSection';
import { useAppColors } from '@/context/AppearanceContext';
import type { AppPalette } from '@/constants/theme';
import { layoutStyles } from '@/components/AdaptiveLayout';
import { router, useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import PetScreen from '@/components/PetScreen';
import AppHeader from '@/components/AppHeader';
import PetHero from '@/components/PetHero';
import PetImage from '@/components/PetImage';
import HealthRecord from '@/components/HealthRecord';
import { useAuth } from '@/context/AuthContext';

export default function FichaSaludScreen() {
  const AppColors = useAppColors();
  const styles = createStyles(AppColors);

  const { mascotas } = useAuth();
  const { mascotaId } = useLocalSearchParams<{ mascotaId?: string }>();
  const mascota = mascotas.find((m) => String(m.id) === mascotaId) ?? mascotas[0];
  return (
    <PetScreen animate={false} style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.content, layoutStyles.page]} keyboardShouldPersistTaps="handled">
          <AppHeader onPressBell={() => router.push('/recordatorios')} />
          <AnimatedSection><PetHero eyebrow="Bienestar en cada huella" title="Ficha de salud" tone="purple"
            description="Su historia, sus cuidados y mucho cariño. Elige una mascota para consultar o actualizar su salud." /></AnimatedSection>
          {mascota ? <>
            <AnimatedSection delay={70} style={{ gap: 16 }}><Text style={styles.label}>Selecciona una mascota</Text>
            <ScrollView horizontal contentContainerStyle={styles.options}>
              {mascotas.map((m) => <AnimatedPressable key={m.id} accessibilityRole="radio" accessibilityState={{ checked: m.id === mascota.id }}
                onPress={() => router.setParams({ mascotaId: String(m.id) })} style={[styles.option, m.id === mascota.id && styles.active]}>
                <PetImage url={m.imagen} nombre={m.nombre} size={32} />
                <Text style={styles.label}>{m.nombre}</Text>
              </AnimatedPressable>)}
            </ScrollView></AnimatedSection>
            <HealthRecord key={mascota.id} mascota={mascota} />
          </> : <View style={styles.empty}>
            <Text style={styles.label}>Registra tu primera mascota</Text>
            <Text style={styles.description}>Podrás completar su ficha de salud después de añadirla.</Text>
            <AnimatedPressable accessibilityRole="button" style={styles.option} onPress={() => router.push('/nueva-mascota')}>
              <Text style={styles.label}>Añadir mascota</Text>
            </AnimatedPressable>
          </View>}
        </ScrollView>
      </KeyboardAvoidingView>
    </PetScreen>
  );
}

const createStyles = (AppColors: AppPalette) => (StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.background },
  content: { padding: 20, paddingBottom: 40, gap: 16, width: '100%', maxWidth: 800, alignSelf: 'center' },
  description: { fontSize: 14, lineHeight: 21, color: AppColors.textSecondary },
  label: { fontSize: 15, fontWeight: '600', color: AppColors.text },
  options: { flexDirection: 'row', gap: 10 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 24, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: AppColors.border, backgroundColor: AppColors.surface },
  active: { backgroundColor: AppColors.infoSoft, borderColor: AppColors.primaryDark },
  empty: { gap: 12 },
}));
