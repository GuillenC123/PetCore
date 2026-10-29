import { useAppColors } from '@/context/AppearanceContext';
import type { AppPalette } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import PetScreen from '@/components/PetScreen';
import { useAuth } from '@/context/AuthContext';
import { HealthEditProvider, useNavegacionSalud } from '@/context/HealthEditContext';
import { useTabletLayout } from '@/hooks/use-tablet-layout';
import { esSeccionSalud, SECCIONES_SALUD, type SeccionSalud } from '@/utils/secciones-salud';
import type { Mascota } from '@/types';
import PetImage from '@/components/PetImage';
import HealthData from '@/components/HealthData';
import WeightTracker from '@/components/WeightTracker';
import VaccineRecord from '@/components/VaccineRecord';
import Treatments from '@/components/Treatments';
import HealthTimeline from '@/components/HealthTimeline';
import { layoutStyles } from '@/components/AdaptiveLayout';

export function generateStaticParams() {
  return SECCIONES_SALUD.map(({ id }) => ({ seccion: id }));
}

export default function SeccionSaludScreen() {
  const AppColors = useAppColors();
  const styles = createStyles(AppColors);

  const { seccion, mascotaId } = useLocalSearchParams<{ seccion?: string; mascotaId?: string }>();
  const { mascotas } = useAuth();
  const mascota = mascotas.find((m) => String(m.id) === mascotaId);
  if (!esSeccionSalud(seccion) || !mascota) return <PetScreen style={styles.safe}>
    <View style={styles.missing}><Text style={styles.title}>{mascota ? 'Sección no encontrada' : 'Mascota no encontrada'}</Text>
      <Text style={styles.description}>Vuelve a la ficha y selecciona una mascota registrada.</Text>
      <Pressable accessibilityRole="button" onPress={() => router.replace('/mascotas')} style={styles.returnButton}><Text style={styles.returnText}>Volver a la ficha de salud</Text></Pressable>
    </View>
  </PetScreen>;
  return <HealthEditProvider key={`${mascota.id}-${seccion}`}>
    <Contenido mascota={mascota} seccion={seccion} />
  </HealthEditProvider>;
}

function Contenido({ mascota, seccion }: { mascota: Mascota; seccion: SeccionSalud }) {
  const AppColors = useAppColors();
  const styles = createStyles(AppColors);

  const { sidebar } = useTabletLayout();
  const { navegar, ocupado } = useNavegacionSalud();
  const actual = SECCIONES_SALUD.find((item) => item.id === seccion)!;
  const volver = () => navegar(() => {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/mascotas', params: { mascotaId: String(mascota.id) } });
  });
  return <PetScreen style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver a la ficha de salud" disabled={ocupado} onPress={volver} style={styles.back}>
        <Ionicons name="arrow-back" size={23} color={AppColors.text} />
      </Pressable>
      <View style={styles.flex}><Text style={styles.eyebrow}>FICHA DE SALUD · {mascota.nombre}</Text><Text style={styles.title}>{actual.titulo}</Text></View>
      <PetImage url={mascota.imagen} nombre={mascota.nombre} size={44} />
    </View>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.body, layoutStyles.page, sidebar && styles.bodyWide]}>
        {sidebar && <ScrollView style={styles.sidebar} contentContainerStyle={styles.sidebarContent}>
          <Text style={styles.menuTitle}>Salud de {mascota.nombre}</Text>
          {SECCIONES_SALUD.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: item.id === seccion, disabled: ocupado }}
            disabled={ocupado} onPress={() => {
              if (item.id !== seccion) navegar(() => router.replace({ pathname: '/salud/[seccion]', params: { seccion: item.id, mascotaId: String(mascota.id) } }));
            }} style={[styles.menuItem, item.id === seccion && styles.menuActive]}>
            <Ionicons name={item.icono} size={21} color={item.id === seccion ? AppColors.accent : AppColors.textSecondary} />
            <Text style={[styles.menuText, item.id === seccion && styles.menuTextActive]}>{item.titulo}</Text>
          </Pressable>)}
        </ScrollView>}
        <ScrollView key={`${mascota.id}-${seccion}`} style={styles.flex} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
          <Text style={styles.description}>{actual.descripcion}</Text>
          <View style={styles.card}>
            {seccion === 'datos' && <HealthData mascota={mascota} />}
            {seccion === 'peso' && <WeightTracker mascota={mascota} />}
            {seccion === 'vacunas' && <VaccineRecord mascota={mascota} />}
            {seccion === 'tratamientos' && <Treatments mascotaId={mascota.id} nombre={mascota.nombre} />}
            {seccion === 'historial' && <HealthTimeline mascota={mascota} />}
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </PetScreen>;
}
const createStyles = (AppColors: AppPalette) => (StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.background }, flex: { flex: 1, minWidth: 0 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, backgroundColor: AppColors.surface, borderBottomWidth: 1, borderBottomColor: AppColors.border },
  back: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 }, eyebrow: { fontSize: 11, fontWeight: '700', color: AppColors.accent, marginBottom: 4 },
  title: { fontSize: 21, fontWeight: '800', color: AppColors.text }, body: { flex: 1 }, bodyWide: { flexDirection: 'row' },
  scroll: { padding: 20, paddingBottom: 40, gap: 16, width: '100%', maxWidth: 860, alignSelf: 'center' }, description: { fontSize: 14, lineHeight: 21, color: AppColors.textSecondary },
  card: { borderRadius: 18, padding: 18, backgroundColor: AppColors.surface, borderWidth: 1, borderColor: AppColors.border },
  sidebar: { width: 260, flexGrow: 0, flexShrink: 0, borderRightWidth: 1, borderRightColor: AppColors.border, backgroundColor: AppColors.surface },
  sidebarContent: { padding: 18, gap: 10 }, menuTitle: { fontSize: 16, fontWeight: '700', color: AppColors.text, marginBottom: 10 },
  menuItem: { minHeight: 56, flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, borderRadius: 12 }, menuActive: { backgroundColor: AppColors.infoSoft },
  menuText: { flex: 1, color: AppColors.textSecondary, fontSize: 14 }, menuTextActive: { color: AppColors.accent, fontWeight: '700' },
  missing: { padding: 24, gap: 18 }, returnButton: { minHeight: 48, padding: 14, borderRadius: 12, backgroundColor: AppColors.primaryDark, alignItems: 'center' }, returnText: { color: AppColors.onPrimary, fontWeight: '700' },
}));
