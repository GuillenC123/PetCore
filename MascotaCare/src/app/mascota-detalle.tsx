// ============================================================================
// mascota-detalle.tsx - Pantalla de Detalle de una Mascota
// ----------------------------------------------------------------------------
// Se abre al tocar una PetCard de la lista. Recibe el "id" de la mascota por
// parámetro de ruta (useLocalSearchParams), la busca en el estado global del
// contexto y muestra su información completa:
//   * Foto grande (o placeholder).
//   * Nombre, raza, especie y edad.
//   * Estado de salud (badge) y tarjetas de resumen.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Badge from '@/components/Badge';
import PetImage from '@/components/PetImage';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { configurarEstadoMascota } from '@/utils/estados';

export default function MascotaDetalleScreen() {
  // Lee el id pasado en la URL (ej. el FAB navega a /mascota-detalle?id=1).
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { mascotas } = useAuth();

  // Busca la mascota por id (convertimos el string a número).
  const mascota = mascotas.find((m) => String(m.id) === id);

  // Si no existe (id inválido), mostramos un mensaje de no encontrada.
  if (!mascota) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.error}>Mascota no encontrada.</Text>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>Volver</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // Config de estado -> etiqueta y tono para el badge.
  const salud = configurarEstadoMascota(mascota.estado);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Cabecera del detalle con botón atrás. */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <Ionicons name="arrow-back" size={24} color={AppColors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Detalle</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* ---- Foto grande de la mascota ---- */}
        <View style={styles.photoBlock}>
          <PetImage url={mascota.imagen} nombre={mascota.nombre} size={140} />
        </View>

        {/* ---- Nombre y estado de salud ---- */}
        <View style={styles.titleBlock}>
          <Text style={styles.nombre}>{mascota.nombre}</Text>
          <Badge label={salud.label} tone={salud.tone} />
        </View>

        {/* ---- Ficha de características ---- */}
        <View style={styles.card}>
          <Fila icon="shield-half-outline" etiqueta="Raza" valor={mascota.raza} />
          <Separador />
          <Fila icon="paw-outline" etiqueta="Especie" valor={mascota.especie} />
          <Separador />
          <Fila icon="hourglass-outline" etiqueta="Edad" valor={mascota.edad} />
        </View>

        {/* ---- Tarjeta de resumen de cuidados ---- */}
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>Cuidados</Text>
          <Text style={styles.cardTexto}>
            Desde aquí podrás agendar próximas actividades, vacunas y citas
            veterinarias para {mascota.nombre} en los próximos avances.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Pequeño componente interno para una fila etiqueta/valor del detalle.
function Fila({ icon, etiqueta, valor }: { icon: IconName; etiqueta: string; valor: string }) {
  return (
    <View style={styles.fila}>
      <Ionicons name={icon} size={18} color={AppColors.primaryDark} />
      <Text style={styles.filaEtiqueta}>{etiqueta}</Text>
      <Text style={styles.filaValor}>{valor}</Text>
    </View>
  );
}

function Separador() {
  return <View style={styles.separador} />;
}

type IconName = keyof typeof Ionicons.glyphMap;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: AppColors.text,
  },
  pressed: {
    opacity: 0.6,
  },
  content: {
    padding: 20,
    gap: 18,
    alignItems: 'center',
  },
  photoBlock: {
    marginTop: 8,
  },
  titleBlock: {
    alignItems: 'center',
    gap: 8,
  },
  nombre: {
    fontSize: 26,
    fontWeight: '800',
    color: AppColors.text,
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: AppColors.surface,
    borderRadius: 18,
    padding: 18,
    gap: 6,
    // Sombra suave.
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTitulo: {
    fontSize: 17,
    fontWeight: '800',
    color: AppColors.text,
    marginBottom: 4,
  },
  cardTexto: {
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 20,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  filaEtiqueta: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textSecondary,
    width: 'auto',
  },
  filaValor: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: AppColors.text,
    textAlign: 'right',
  },
  separador: {
    height: 1,
    backgroundColor: '#EEF0F3',
    marginVertical: 4,
  },
  error: {
    textAlign: 'center',
    marginTop: 60,
    fontSize: 16,
    color: AppColors.textSecondary,
  },
  back: {
    marginTop: 16,
    alignSelf: 'center',
  },
  backText: {
    color: AppColors.primaryDark,
    fontSize: 15,
    fontWeight: '700',
  },
});