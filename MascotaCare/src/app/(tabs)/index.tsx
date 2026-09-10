// ============================================================================
// (tabs)/index.tsx - Pantalla de Inicio
// ----------------------------------------------------------------------------
// Layout de la pantalla principal:
//   * Cabecera (AppHeader) con huella + campana.
//   * Saludo "¡Hola, Ana!" con párrafo gris de resumen.
//   * Dos acciones rápidas: "Añadir Mascota" y "Agendar Cita".
//   * Cuidados prioritarios con acciones desplegables.
//   * Mascotas en una lista horizontal con sus estados de salud.
// ============================================================================

import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '@/components/AppHeader';
import CareAgenda from '@/components/CareAgenda';
import { crearAgenda } from '@/utils/agenda';
import PetCard from '@/components/PetCard';
import QuickActionCard from '@/components/QuickActionCard';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useAhora } from '@/hooks/use-ahora';

export default function HomeScreen() {
  // Lee del contexto el usuario y los datos de la app.
  const { usuario, mascotas, citas, recordatorios, tratamientos } = useAuth();
  const ahora = useAhora();

  // Primer nombre del usuario para el saludo.
  const primerNombre = usuario?.nombre.split(' ')[0] ?? 'Amigo';
  // Cuidados pendientes hasta el final de hoy, incluidos los vencidos.
  const cuidados = crearAgenda(citas, tratamientos, recordatorios);
  const finHoy = new Date(ahora); finHoy.setHours(23, 59, 59, 999);
  const pendientesHoy = cuidados.filter((e) => Date.parse(e.fecha) <= finHoy.getTime()).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* ------ Cabecera general ------ */}
        <AppHeader onPressBell={() => router.push('/recordatorios')} />

        {/* ------ Saludo y resumen ------ */}
        <View style={styles.greeting}>
          <Text style={styles.hola}>¡Hola, {primerNombre}!</Text>
          <Text style={styles.parrafo}>
            {pendientesHoy === 0 ? 'No tienes cuidados de hoy ni vencidos con fecha registrada.' : `Tienes ${pendientesHoy} cuidados de hoy o vencidos por revisar.`}
          </Text>
        </View>

        {/* ------ Acciones rápidas ------ */}
        <View style={styles.actionsRow}>
          <QuickActionCard
            icon="add-circle-outline"
            label="Añadir Mascota"
            onPress={() => router.push('/nueva-mascota')}
          />
          <QuickActionCard
            icon="calendar-outline"
            label="Agendar Cita"
            circleColor="#DCFCE7"
            iconColor={AppColors.success}
            onPress={() => router.push('/nueva-cita')}
          />
        </View>

        <Text style={styles.sectionTitle}>Cuidados de hoy y vencidos</Text>
        <CareAgenda compact />
        {/* ------ Sección Mis Mascotas ------ */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mis Mascotas</Text>
          <Text style={styles.link} onPress={() => router.push('/mascotas')}>
            Ficha de salud
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
          {/* El estado se mantiene visible también en Inicio. */}
          {mascotas.map((m) => (
            <View key={m.id} style={styles.pet}>
            <PetCard
              mascota={m}
              showStatus
              onPress={() => router.push(`/mascota-detalle?id=${m.id}`)}
            /></View>
          ))}
        </ScrollView>
        {mascotas.length === 0 && <Text style={styles.empty}>Añade tu primera mascota para empezar a organizar sus cuidados.</Text>}
        {mascotas.length > 1 && <Text style={styles.empty}>Desliza para ver tus mascotas.</Text>}

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
    paddingBottom: 32,
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    gap: 16,
  },
  greeting: {
    gap: 4,
    marginTop: 4,
  },
  hola: {
    fontSize: 24,
    fontWeight: '800',
    color: AppColors.text,
  },
  parrafo: {
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: AppColors.text,
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.primaryDark,
  },
  list: {
    gap: 12,
  },
  pet: { width: 270 },
  empty: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
});
