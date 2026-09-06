// ============================================================================
// (tabs)/perfil.tsx - Pantalla de Perfil
// ----------------------------------------------------------------------------
// Muestra la información del usuario y un menú de opciones:
//   * Cabecera general.
//   * Avatar circular de usuario + nombre y correo.
//   * Estadísticas (Mascotas, Citas, Pendientes).
//   * Menú de opciones (Editar Perfil, Notificaciones, Ayuda, Cerrar sesión).
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '@/components/AppHeader';
import MenuRow, { type MenuOptionType } from '@/components/MenuRow';
import StatCard from '@/components/StatCard';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function PerfilScreen() {
  const { usuario, mascotas, citas, recordatorios, logout } = useAuth();

  // Estadísticas dinámicas a partir de los datos actuales.
  const totalMascotas = mascotas.length;
  const totalCitas = citas.length;
  const pendientes = recordatorios.filter((r) => !r.completado).length;

  // Opciones del menú de perfil.
  const opciones: { label: string; tipo: MenuOptionType }[] = [
    { label: 'Editar Perfil', tipo: 'edit' },
    { label: 'Notificaciones', tipo: 'notifications' },
    { label: 'Ayuda', tipo: 'help' },
    { label: 'Cerrar sesión', tipo: 'logout' },
  ];

  // Acciones de cada opción del menú.
  const manejarOpcion = (tipo: MenuOptionType) => {
    switch (tipo) {
      case 'edit':
        router.push('/editar-perfil');
        break;
      case 'notifications':
        router.push('/recordatorios');
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* Cabecera general. */}
        <AppHeader onPressBell={() => router.push('/recordatorios')} />

        {/* Título y subtítulo. */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Mi Perfil</Text>
          <Text style={styles.subtitle}>Gestiona tu cuenta y preferencias.</Text>
        </View>

        {/* Avatar circular de usuario + nombre y correo. */}
        <View style={styles.avatarBlock}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={44} color={AppColors.primaryDark} />
          </View>
          <Text style={styles.nombre}>{usuario?.nombre ?? 'Usuario'}</Text>
          <Text style={styles.correo}>{usuario?.correo ?? ''}</Text>
        </View>

        {/* Fila de estadísticas. */}
        <View style={styles.statsRow}>
          <StatCard valor={totalMascotas} label="Mascotas" />
          <StatCard valor={totalCitas} label="Citas" />
          <StatCard valor={pendientes} label="Pendiente" />
        </View>

        {/* Menú de opciones. */}
        <View style={styles.menu}>
          {opciones.map((op) => (
            <MenuRow
              key={op.tipo}
              label={op.label}
              tipo={op.tipo}
              onPress={() => manejarOpcion(op.tipo)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  titleBlock: {
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: AppColors.text,
  },
  subtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  avatarBlock: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
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
});
