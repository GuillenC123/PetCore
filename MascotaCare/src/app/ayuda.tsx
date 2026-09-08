import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppColors } from '@/constants/theme';

const secciones: {
  titulo: string;
  icono: keyof typeof Ionicons.glyphMap;
  descripcion: string;
}[] = [
  {
    titulo: 'Inicio',
    icono: 'home-outline',
    descripcion: 'Consulta el resumen de tus mascotas, próximas citas y recordatorios pendientes. Usa la barra inferior para cambiar entre Inicio, Ficha de salud, Citas y Perfil.',
  },
  {
    titulo: 'Ficha de salud',
    icono: 'medical-outline',
    descripcion: 'Selecciona una mascota y pulsa Editar ficha de salud para registrar nacimiento o edad aproximada, sexo, peso, alergias y condiciones. Guarda los cambios antes de cambiar de mascota. Los datos se conservan durante la sesión.',
  },
  {
    titulo: 'Añadir y consultar mascotas',
    icono: 'paw-outline',
    descripcion: 'Pulsa “Añadir Mascota” en Inicio o el botón +. Completa el nombre, especie, raza y edad, y pulsa “Guardar Mascota”. Toca la tarjeta de una mascota para ver su información y estado de salud.',
  },
  {
    titulo: 'Consultar citas',
    icono: 'calendar-outline',
    descripcion: 'En Citas puedes ver la fecha, hora, estado y los datos del veterinario disponibles. Actualmente, el acceso “Agendar Cita” de Inicio abre esta lista; la creación de citas aún no está disponible.',
  },
  {
    titulo: 'Notificaciones y recordatorios',
    icono: 'notifications-outline',
    descripcion: 'Toca la campana o entra en Perfil → Notificaciones para abrir los mismos recordatorios. Pulsa la casilla para marcar uno como completado o volver a dejarlo pendiente. Los pendientes aparecen primero. Usa la X para cerrar.',
  },
  {
    titulo: 'Editar tu perfil',
    icono: 'person-outline',
    descripcion: 'En Perfil → Editar Perfil puedes cambiar tu nombre y correo. El nombre admite letras, espacios y tildes, entre 2 y 120 caracteres. El correo debe tener un formato como nombre@dominio.com. Pulsa “Guardar cambios” y verás la confirmación. “Cancelar” descarta los cambios que no hayas guardado.',
  },
  {
    titulo: 'Mensajes de los formularios',
    icono: 'checkmark-circle-outline',
    descripcion: 'Si falta un dato obligatorio o su formato es incorrecto, al guardar aparecerá un mensaje debajo del campo. Corrígelo e inténtalo de nuevo. En el registro, ambas contraseñas deben coincidir. El icono del ojo permite mostrar u ocultar la contraseña.',
  },
  {
    titulo: 'Tu sesión',
    icono: 'log-out-outline',
    descripcion: 'Para salir, entra en Perfil → Cerrar sesión. En esta versión, las mascotas añadidas y los cambios de perfil se conservan durante la sesión; al reiniciar la app o volver a iniciar sesión tendrás que introducirlos de nuevo.',
  },
];

export default function AyudaScreen() {
  const volver = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/perfil');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={volver}
          accessibilityRole="button"
          accessibilityLabel="Volver al perfil"
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Ionicons name="arrow-back" size={24} color={AppColors.text} />
        </Pressable>
        <Text style={styles.title} accessibilityRole="header">Ayuda</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>Aprende a usar MascotaCare</Text>
        <Text style={styles.subtitle}>
          Organiza la información y los cuidados de tus mascotas con esta guía rápida.
        </Text>
        {secciones.map((seccion) => (
          <View key={seccion.titulo} style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name={seccion.icono} size={23} color={AppColors.primaryDark} />
              <Text style={styles.cardTitle} accessibilityRole="header">{seccion.titulo}</Text>
            </View>
            <Text style={styles.description}>{seccion.descripcion}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  back: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21 },
  pressed: { opacity: 0.7 },
  title: { fontSize: 18, fontWeight: '800', color: AppColors.text },
  content: { padding: 20, gap: 16 },
  intro: { fontSize: 22, fontWeight: '800', color: AppColors.text },
  subtitle: { fontSize: 14, lineHeight: 21, color: AppColors.textSecondary },
  card: { backgroundColor: AppColors.surface, borderRadius: 16, padding: 18, gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: AppColors.text },
  description: { fontSize: 14, lineHeight: 22, color: AppColors.textSecondary },
});
