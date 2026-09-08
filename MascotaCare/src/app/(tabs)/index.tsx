// ============================================================================
// (tabs)/index.tsx - Pantalla de Inicio
// ----------------------------------------------------------------------------
// Layout de la pantalla principal:
//   * Cabecera (AppHeader) con huella + campana.
//   * Saludo "¡Hola, Ana!" con párrafo gris de resumen.
//   * Dos acciones rápidas: "Añadir Mascota" y "Agendar Cita".
//   * Sección "Mis Mascotas" (sin etiquetas de estado).
//   * Sección "Próximas Citas" (primera cita).
//   * FAB en la esquina inferior derecha.
// ============================================================================

import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '@/components/AppHeader';
import AppointmentCard from '@/components/AppointmentCard';
import FAB from '@/components/FAB';
import PetCard from '@/components/PetCard';
import QuickActionCard from '@/components/QuickActionCard';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { obtenerProximasCitas } from '@/utils/citas';
import { useAhora } from '@/hooks/use-ahora';
import { estadoRecordatorio } from '@/utils/recordatorios';

export default function HomeScreen() {
  // Lee del contexto el usuario y los datos de la app.
  const { usuario, mascotas, citas, recordatorios } = useAuth();
  const ahora = useAhora();

  // Primer nombre del usuario para el saludo.
  const primerNombre = usuario?.nombre.split(' ')[0] ?? 'Amigo';
  // Número de eventos próximos (citas + recordatorios pendientes).
  const pendientes = recordatorios.filter((r) => !r.completado).length;
  const proximasCitas = obtenerProximasCitas(citas, ahora);
  const vencidos = recordatorios.filter((r) => estadoRecordatorio(r, ahora) === 'Vencido').length;
  const hoy = recordatorios.filter((r) => estadoRecordatorio(r, ahora) === 'Hoy').length;
  const sinFecha = recordatorios.filter((r) => estadoRecordatorio(r, ahora) === 'Sin fecha').length;

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
            {proximasCitas.length === 0 && pendientes === 0
              ? 'No tienes visitas próximas ni recordatorios pendientes.'
              : `Tienes ${proximasCitas.length} visitas próximas y ${pendientes} recordatorios pendientes.`}
          </Text>
          {pendientes > 0 && <Text style={styles.parrafo}>{vencidos} vencidos · {hoy} por hacer hoy · {sinFecha} sin fecha.</Text>}
          <Text style={styles.link} onPress={() => router.push('/recordatorios')}>Gestionar recordatorios</Text>
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

        {/* ------ Sección Mis Mascotas ------ */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mis Mascotas</Text>
          <Text style={styles.link} onPress={() => router.push('/mascotas')}>
            Ver todas
          </Text>
        </View>
        <View style={styles.list}>
          {/* El estado se mantiene visible también en Inicio. */}
          {mascotas.map((m) => (
            <PetCard
              key={m.id}
              mascota={m}
              showStatus
              onPress={() => router.push(`/mascota-detalle?id=${m.id}`)}
            />
          ))}
        </View>

        {/* ------ Sección Próximas Citas ------ */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Próximas Citas</Text>
        </View>
        {proximasCitas.length > 0 ? (
          <AppointmentCard cita={proximasCitas[0]} />
        ) : (
          <Text style={styles.empty}>No tienes citas próximas.</Text>
        )}
      </ScrollView>

      {/* Botón flotante de acción */}
      <FAB onPress={() => router.push('/nueva-mascota')} />
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
    paddingBottom: 100, // deja espacio para el FAB.
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
  empty: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
});
