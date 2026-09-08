import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import FormInput from '@/components/FormInput';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { interpretarFechaVisita } from '@/utils/citas';

export default function NuevaCitaScreen() {
  const { mascotas, agregarCita } = useAuth();
  const params = useLocalSearchParams<{ mascotaId?: string }>();
  const [mascotaId, setMascotaId] = useState<number | null>(() => {
    const id = Number(params.mascotaId);
    return mascotas.some((m) => m.id === id) ? id : null;
  });
  const [motivo, setMotivo] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [errores, setErrores] = useState<Record<string, string>>({});
  const guardando = useRef(false);

  const limpiarError = (campo: string) => setErrores((prev) => ({ ...prev, [campo]: '', general: '' }));
  const guardar = () => {
    if (guardando.current) return;
    const erroresNuevos: Record<string, string> = {};
    if (!mascotas.some((m) => m.id === mascotaId)) erroresNuevos.mascota = 'Selecciona una mascota.';
    if (!motivo.trim()) erroresNuevos.motivo = 'Describe el motivo o malestar de tu mascota.';
    const fechaVisita = interpretarFechaVisita(fecha, hora);
    if (!fechaVisita) erroresNuevos.fecha = 'Introduce una fecha válida (DD/MM/AAAA) y una hora válida (HH:MM).';
    else if (fechaVisita.getTime() <= Date.now()) erroresNuevos.fecha = 'La visita debe tener una fecha y hora futuras.';
    setErrores(erroresNuevos);
    if (Object.keys(erroresNuevos).length || !fechaVisita || mascotaId === null) return;
    guardando.current = true;
    try {
      agregarCita({ mascota_id: mascotaId, motivo, fecha_hora: fechaVisita.toISOString() });
      router.replace({ pathname: '/citas', params: { creada: '1' } });
    } catch (error) {
      guardando.current = false;
      setErrores({ general: error instanceof Error ? error.message : 'No se pudo guardar la visita.' });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Volver" style={styles.back}>
            <Ionicons name="arrow-back" size={24} color={AppColors.text} />
          </Pressable>
          <Text style={styles.title}>Recordar visita</Text>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.description}>Anota cuándo llevarás a tu mascota a la veterinaria y el motivo de la visita.</Text>
          <Text style={styles.description}>Al guardar, la mascota seleccionada aparecerá con estado Malestar en rojo.</Text>
          {mascotas.length === 0 ? (
            <View style={styles.group}>
              <Text style={styles.label}>Primero registra una mascota</Text>
              <Text style={styles.description}>Después podrás seleccionarla para crear su recordatorio.</Text>
              <Pressable style={styles.button} onPress={() => router.push('/nueva-mascota')} accessibilityRole="button">
                <Text style={styles.buttonText}>Añadir mascota</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.group}>
                <Text style={styles.label}>¿Qué mascota irá?</Text>
                {mascotas.map((mascota) => (
                  <Pressable key={mascota.id} accessibilityRole="radio" accessibilityState={{ checked: mascotaId === mascota.id }}
                    onPress={() => { setMascotaId(mascota.id); limpiarError('mascota'); }}
                    style={[styles.pet, mascotaId === mascota.id && styles.selected]}>
                    <Ionicons name={mascotaId === mascota.id ? 'radio-button-on' : 'radio-button-off'} size={22} color={AppColors.primaryDark} />
                    <Text style={styles.petName}>{mascota.nombre}</Text>
                    <Text style={styles.description}>{mascota.especie}</Text>
                  </Pressable>
                ))}
                {!!errores.mascota && <Text style={styles.error} accessibilityRole="alert">{errores.mascota}</Text>}
              </View>
              <View style={styles.group}>
                <Text style={styles.label}>Motivo o malestar</Text>
                <FormInput accessibilityLabel="Motivo o malestar" placeholder="Describe lo que has observado en tu mascota"
                  value={motivo} onChangeText={(value) => { setMotivo(value); limpiarError('motivo'); }}
                  multiline maxLength={1000} style={styles.reason} error={errores.motivo} />
                <Text style={styles.description}>{motivo.length}/1000 caracteres</Text>
              </View>
              <View style={styles.group}>
                <Text style={styles.label}>Fecha de la visita</Text>
                <FormInput icon="calendar-outline" accessibilityLabel="Fecha de la visita, día mes y año" placeholder="DD/MM/AAAA"
                  value={fecha} maxLength={10} onChangeText={(value) => { setFecha(value); limpiarError('fecha'); }} />
              </View>
              <View style={styles.group}>
                <Text style={styles.label}>Hora de la visita</Text>
                <FormInput icon="time-outline" accessibilityLabel="Hora de la visita, formato de 24 horas" placeholder="HH:MM, por ejemplo 15:30"
                  value={hora} maxLength={5} onChangeText={(value) => { setHora(value); limpiarError('fecha'); }} />
                <Text style={styles.description}>Formato de 24 horas. Se usa la hora local de tu dispositivo.</Text>
                {!!errores.fecha && <Text style={styles.error} accessibilityRole="alert">{errores.fecha}</Text>}
              </View>
              <Text style={styles.description}>El recordatorio estará disponible en Citas y en la campana durante esta sesión.</Text>
              {!!errores.general && <Text style={styles.error} accessibilityRole="alert">{errores.general}</Text>}
              <Pressable style={styles.button} onPress={guardar} accessibilityRole="button">
                <Text style={styles.buttonText}>Guardar recordatorio</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: AppColors.text },
  content: { padding: 20, gap: 22, paddingBottom: 40, width: '100%', maxWidth: 800, alignSelf: 'center' },
  group: { gap: 10 },
  label: { fontSize: 16, fontWeight: '700', color: AppColors.text },
  description: { fontSize: 14, lineHeight: 21, color: AppColors.textSecondary },
  pet: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: AppColors.surface },
  selected: { borderColor: AppColors.primaryDark, backgroundColor: AppColors.infoSoft },
  petName: { flex: 1, fontSize: 16, fontWeight: '600', color: AppColors.text },
  reason: { flex: 1, minHeight: 120, paddingVertical: 14, fontSize: 15, color: AppColors.text, textAlignVertical: 'top' },
  error: { fontSize: 14, color: AppColors.danger },
  button: { backgroundColor: '#0369A1', borderRadius: 16, padding: 16, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
