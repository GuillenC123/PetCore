import AnimatedPressable from '@/components/AnimatedPressable';
import AnimatedSection from '@/components/AnimatedSection';
import { useAppColors } from '@/context/AppearanceContext';
import type { AppPalette } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import type { Mascota } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useAhora } from '@/hooks/use-ahora';
import { edadMascota } from '@/utils/salud';
import { resumenesSalud, seccionesConColores, type SeccionSalud } from '@/utils/secciones-salud';
import PetHealthStatus from './PetHealthStatus';
import PetImage from './PetImage';
import { AdaptiveColumns } from './AdaptiveLayout';

/** Portada de salud: cada tarjeta abre una pantalla dedicada de la misma mascota. */
export default function HealthRecord({ mascota }: { mascota: Mascota }) {
  const AppColors = useAppColors();
  const styles = createStyles(AppColors);

  const { tratamientos, citas } = useAuth();
  const ahora = useAhora();
  const resumenes = resumenesSalud(mascota, tratamientos, citas, ahora);
  const abrir = (seccion: SeccionSalud) => router.push({ pathname: '/salud/[seccion]', params: { seccion, mascotaId: String(mascota.id) } });
  return <View style={styles.section}>
    <AnimatedSection delay={100} style={styles.identity}>
      <PetImage url={mascota.imagen} nombre={mascota.nombre} size={76} />
      <View style={styles.identityText}>
        <Text style={styles.name}>{mascota.nombre}</Text>
        <Text style={styles.text}>{mascota.especie} · {mascota.raza}</Text>
        <Text style={styles.text}>{edadMascota(mascota)}{mascota.peso != null ? ` · ${mascota.peso.toLocaleString('es-PE')} kg` : ''}</Text>
        <PetHealthStatus mascota={mascota} compact />
      </View>
    </AnimatedSection>
    <Text style={styles.heading}>Su salud, por secciones</Text>
    <AdaptiveColumns minColumnWidth={300}>
      {seccionesConColores(AppColors).map((seccion, index) => <AnimatedSection key={seccion.id} delay={160 + index * 65}><AnimatedPressable accessibilityRole="button"
        accessibilityLabel={`Abrir ${seccion.titulo} de ${mascota.nombre}`} onPress={() => abrir(seccion.id)}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <View style={styles.cardHeader}>
          <View style={[styles.icon, { backgroundColor: seccion.fondo }]}><Ionicons name={seccion.icono} size={23} color={seccion.color} /></View>
          <Text style={styles.title}>{seccion.titulo}</Text>
          <Ionicons name="chevron-forward" size={18} color={AppColors.textSecondary} />
        </View>
        <Text style={styles.description}>{seccion.descripcion}</Text>
        <View style={[styles.summary, { backgroundColor: seccion.fondo }]}><Text style={[styles.summaryText, { color: seccion.color }]}>{resumenes[seccion.id]}</Text></View>
      </AnimatedPressable></AnimatedSection>)}
    </AdaptiveColumns>
  </View>;
}
const createStyles = (AppColors: AppPalette) => (StyleSheet.create({
  section: { gap: 18 }, identity: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: AppColors.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: AppColors.border },
  identityText: { flex: 1, gap: 5 }, name: { fontSize: 23, fontWeight: '800', color: AppColors.text }, text: { fontSize: 13, lineHeight: 19, color: AppColors.textSecondary },
  heading: { fontSize: 17, fontWeight: '700', color: AppColors.text }, card: { padding: 20, borderRadius: 24, backgroundColor: AppColors.surface, borderWidth: 1, borderColor: AppColors.border, gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 }, icon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: AppColors.text }, description: { color: AppColors.textSecondary, fontSize: 13, lineHeight: 19 },
  summary: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9 }, summaryText: { fontSize: 12, lineHeight: 18, fontWeight: '600' }, pressed: { opacity: 0.7 },
}));
