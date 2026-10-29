import { useAppColors } from '@/context/AppearanceContext';
import AnimatedSection from '@/components/AnimatedSection';
import type { AppPalette } from '@/constants/theme';
import { AdaptiveColumns, layoutStyles } from '@/components/AdaptiveLayout';
// ============================================================================
// (tabs)/perfil.tsx - Pantalla de Perfil
// ----------------------------------------------------------------------------
// Muestra la información del usuario y un menú de opciones:
//   * Cabecera general.
//   * Avatar circular de usuario + nombre y correo.
//   * Estadísticas (Mascotas, Citas, Pendientes).
//   * Menú de opciones (Editar Perfil, Configuración, Ayuda, Cerrar sesión).
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import PetScreen from '@/components/PetScreen';

import AppHeader from '@/components/AppHeader';
import PetHero from '@/components/PetHero';
import MenuRow, { type MenuOptionType } from '@/components/MenuRow';
import StatCard from '@/components/StatCard';
import { useAuth } from '@/context/AuthContext';

export default function PerfilScreen() {
  const AppColors = useAppColors();
  const styles = createStyles(AppColors);

  const { usuario, mascotas, citas, recordatorios, logout } = useAuth();

  // Estadísticas dinámicas a partir de los datos actuales.
  const totalMascotas = mascotas.length;
  const totalCitas = citas.length;
  const pendientes = recordatorios.filter((r) => !r.completado).length;

  // Opciones del menú de perfil.
  const opciones: { label: string; tipo: MenuOptionType }[] = [
    { label: 'Editar Perfil', tipo: 'edit' },
    { label: 'Configuración', tipo: 'settings' },
    { label: 'Ayuda', tipo: 'help' },
    { label: 'Cerrar sesión', tipo: 'logout' },
  ];

  // Acciones de cada opción del menú.
  const manejarOpcion = (tipo: MenuOptionType) => {
    switch (tipo) {
      case 'edit':
        router.push('/editar-perfil');
        break;
      case 'settings':
        router.push('/configuracion');
        break;
      case 'help':
        router.push('/ayuda');
        break;
      case 'logout':
        logout(); // cierra la sesión (redirige a login por el stack protegido).
        break;
    }
  };

  return (
    <PetScreen animate={false} style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, layoutStyles.page]}
        showsVerticalScrollIndicator={false}>
        {/* Cabecera general. */}
        <AppHeader onPressBell={() => router.push('/recordatorios')} />

        {/* Título y subtítulo. */}
        <AnimatedSection><PetHero eyebrow="Su persona favorita" title="Mi perfil" tone="orange"
          description="Tu espacio en esta pequeña gran familia. Personaliza tu cuenta y la forma de cuidarles." /></AnimatedSection>

        <AdaptiveColumns>
        <View style={layoutStyles.column}>
        {/* Avatar circular de usuario + nombre y correo. */}
        <AnimatedSection delay={90} style={styles.avatarBlock}>
          <View style={styles.avatar}>
            {usuario?.imagen ? <Image source={{ uri: usuario.imagen }} contentFit="cover" accessibilityLabel="Foto de perfil" style={{ width: 90, height: 90, borderRadius: 45 }} />
              : <Ionicons name="person" size={44} color={AppColors.accent} />}
          </View>
          <Text style={styles.nombre}>{usuario?.nombre ?? 'Usuario'}</Text>
          <View style={styles.familyBadge}><Ionicons name="heart" size={13} color={AppColors.teal} /><Text style={styles.familyText}>Parte de su mundo</Text></View>
          <Text style={styles.correo}>{usuario?.correo ?? ''}</Text>
        </AnimatedSection>

        {/* Fila de estadísticas. */}
        <AnimatedSection delay={170} style={styles.statsRow}>
          <StatCard valor={totalMascotas} label="Mascotas" />
          <StatCard valor={totalCitas} label="Citas" />
          <StatCard valor={pendientes} label="Pendiente" />
        </AnimatedSection>

        </View>
        {/* Menú de opciones. */}
        <View style={styles.menu}>
          {opciones.map((op, index) => (
            <AnimatedSection key={op.tipo} delay={190 + index * 65}>
            <MenuRow
              label={op.label}
              tipo={op.tipo}
              onPress={() => manejarOpcion(op.tipo)}
            />
            </AnimatedSection>
          ))}
        </View>
        </AdaptiveColumns>
      </ScrollView>
    </PetScreen>
  );
}

const createStyles = (AppColors: AppPalette) => (StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  avatarBlock: {
    alignItems: 'center',
    gap: 6,
    padding: 24,
    backgroundColor: AppColors.surface,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  familyBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: AppColors.tealSoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  familyText: { color: AppColors.teal, fontSize: 12, fontWeight: '600' },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: AppColors.infoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nombre: {
    fontSize: 20,
    fontWeight: '800',
    color: AppColors.text,
  },
  correo: {
    fontSize: 13,
    color: AppColors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  menu: {
    gap: 12,
  },
}));
