// ============================================================================
// (tabs)/mascotas.tsx - Pantalla de Mascotas
// ----------------------------------------------------------------------------
// Muestra la lista de mascotas con sus etiquetas de estado de salud visibles.
// Incluye la cabecera general, un título con subtítulo, la lista de PetCards
// (con showStatus = true) y el FAB para añadir mascotas.
// ============================================================================

import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppHeader from '@/components/AppHeader';
import FAB from '@/components/FAB';
import PetCard from '@/components/PetCard';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function MascotasScreen() {
  const { mascotas } = useAuth();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* Cabecera general (huella + campana). */}
        <AppHeader onPressBell={() => router.push('/recordatorios')} />

        {/* Título y subtítulo de la pantalla. */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Mis Mascotas</Text>
          <Text style={styles.subtitle}>Gestiona el cuidado de tus compañeros.</Text>
        </View>

        {/* Lista de mascotas con sus etiquetas de estado. */}
        <View style={styles.list}>
          {mascotas.length === 0 ? (
            <Text style={styles.empty}>
              Aún no tienes mascotas. Toca el botón + para añadir.
            </Text>
          ) : (
            mascotas.map((m) => (
              <PetCard
                key={m.id}
                mascota={m}
                showStatus
                onPress={() => router.push(`/mascota-detalle?id=${m.id}`)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB para añadir una nueva mascota. */}
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
    paddingBottom: 100,
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
  list: {
    gap: 12,
  },
  empty: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginTop: 8,
  },
});