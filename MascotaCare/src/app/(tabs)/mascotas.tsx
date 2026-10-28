import { useAppColors } from '@/context/AppearanceContext';
import type { AppPalette } from '@/constants/theme';
import { layoutStyles } from '@/components/AdaptiveLayout';
import { router, useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from '@/components/AppHeader';
import HealthRecord from '@/components/HealthRecord';
import { useAuth } from '@/context/AuthContext';

export default function FichaSaludScreen() {
  const AppColors = useAppColors();
  const styles = createStyles(AppColors);

  const { mascotas } = useAuth();
  const { mascotaId } = useLocalSearchParams<{ mascotaId?: string }>();
  const mascota = mascotas.find((m) => String(m.id) === mascotaId) ?? mascotas[0];
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.content, layoutStyles.page]} keyboardShouldPersistTaps="handled">
          <AppHeader onPressBell={() => router.push('/recordatorios')} />
          <Text style={styles.title}>Ficha de salud</Text>
          <Text style={styles.description}>Elige una mascota y entra a la sección que quieras consultar o actualizar.</Text>
          {mascota ? <>
            <Text style={styles.label}>Selecciona una mascota</Text>
            <ScrollView horizontal contentContainerStyle={styles.options}>
              {mascotas.map((m) => <Pressable key={m.id} accessibilityRole="radio" accessibilityState={{ checked: m.id === mascota.id }}
                onPress={() => router.setParams({ mascotaId: String(m.id) })} style={[styles.option, m.id === mascota.id && styles.active]}>
                <Text style={styles.label}>{m.nombre}</Text>
              </Pressable>)}
            </ScrollView>
            <HealthRecord key={mascota.id} mascota={mascota} />
          </> : <View style={styles.empty}>
            <Text style={styles.label}>Registra tu primera mascota</Text>
            <Text style={styles.description}>Podrás completar su ficha de salud después de añadirla.</Text>
            <Pressable accessibilityRole="button" style={styles.option} onPress={() => router.push('/nueva-mascota')}>
              <Text style={styles.label}>Añadir mascota</Text>
            </Pressable>
          </View>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (AppColors: AppPalette) => (StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.background },
  content: { padding: 20, paddingBottom: 40, gap: 16, width: '100%', maxWidth: 800, alignSelf: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: AppColors.text },
  description: { fontSize: 14, lineHeight: 21, color: AppColors.textSecondary },
  label: { fontSize: 15, fontWeight: '600', color: AppColors.text },
  options: { flexDirection: 'row', gap: 10 },
  option: { borderRadius: 12, padding: 14, borderWidth: 1, borderColor: AppColors.textMuted, backgroundColor: AppColors.surface },
  active: { backgroundColor: AppColors.infoSoft, borderColor: AppColors.primaryDark },
  empty: { gap: 12 },
}));
