import { useAppColors } from '@/context/AppearanceContext';
import type { AppPalette } from '@/constants/theme';
import { AdaptiveColumns, layoutStyles } from '@/components/AdaptiveLayout';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import AnimatedPressable from '@/components/AnimatedPressable';
import VisitTypeSelector from '@/components/VisitTypeSelector';
import PetScreen from '@/components/PetScreen';

import FormInput from '@/components/FormInput';
import { useAuth } from '@/context/AuthContext';
import { useAviso } from '@/context/AvisosContext';
import { interpretarFechaVisita } from '@/utils/citas';
import { buscarPorId } from '@/utils/identificadores';
import type { Identificador, TipoVisita } from '@/types';

export default function NuevaCitaScreen() {
  const AppColors = useAppColors();
  const styles = createStyles(AppColors);

  const { mascotas, agregarCita, modoDemo } = useAuth();
  const mostrarAviso = useAviso();
  const params = useLocalSearchParams<{ mascotaId?: string }>();
  const [seleccionada, setMascotaId] = useState<Identificador | null>(null);
  const mascotaId = seleccionada ?? buscarPorId(mascotas, params.mascotaId)?.id ?? null;
  const [tipoVisita, setTipoVisita] = useState<TipoVisita | null>(null);
  const [motivo, setMotivo] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [errores, setErrores] = useState<Record<string, string>>({});
  const bloqueo = useRef(false);
  const [guardando, setGuardando] = useState(false);
  const volver = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/citas');
  };

  const limpiarError = (campo: string) => setErrores((prev) => ({ ...prev, [campo]: '', general: '' }));
  const guardar = async () => {
    if (bloqueo.current) return;
    const erroresNuevos: Record<string, string> = {};
    if (!mascotas.some((m) => m.id === mascotaId)) erroresNuevos.mascota = 'Selecciona una mascota.';
    if (!tipoVisita) erroresNuevos.tipo = 'Selecciona el tipo de visita.';
    if (tipoVisita === 'otro' && !motivo.trim()) erroresNuevos.motivo = 'Describe el motivo de la visita.';
    const fechaVisita = interpretarFechaVisita(fecha, hora);
    if (!fechaVisita) erroresNuevos.fecha = 'Selecciona la fecha y la hora de la visita.';
    else if (fechaVisita.getTime() <= Date.now()) erroresNuevos.fecha = 'La visita debe tener una fecha y hora futuras.';
    setErrores(erroresNuevos);
    if (Object.keys(erroresNuevos).length || !fechaVisita || mascotaId === null || !tipoVisita) return;
    bloqueo.current = true;
    setGuardando(true);
    try {
      await agregarCita({ mascota_id: mascotaId, motivo, fecha_hora: fechaVisita.toISOString(), tipo_visita: tipoVisita });
      mostrarAviso(modoDemo ? 'Cita guardada para esta sesión.' : 'Cita guardada.');
      router.replace({ pathname: '/citas', params: { creada: '1' } });
    } catch (error) {
      bloqueo.current = false;
      setGuardando(false);
      setErrores({ general: error instanceof Error ? error.message : 'No se pudo guardar la visita.' });
    }
  };

  return (
    <PetScreen style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <AnimatedPressable onPress={volver} disabled={guardando} accessibilityRole="button" accessibilityLabel="Volver" style={styles.back}>
            <Ionicons name="arrow-back" size={24} color={AppColors.text} />
          </AnimatedPressable>
          <Text accessibilityRole="header" style={styles.title}>Agendar visita</Text>
        </View>
        <ScrollView contentContainerStyle={[styles.content, layoutStyles.form]} keyboardShouldPersistTaps="handled">
          <Text style={styles.description}>Anota cuándo llevarás a tu mascota a la veterinaria y el motivo de la visita.</Text>
          {mascotas.length === 0 ? (
            <View style={styles.group}>
              <Text style={styles.label}>Primero registra una mascota</Text>
              <Text style={styles.description}>Después podrás seleccionarla para crear su recordatorio.</Text>
              <AnimatedPressable style={styles.button} onPress={() => router.push('/nueva-mascota')} accessibilityRole="button">
                <Text style={styles.buttonText}>Añadir mascota</Text>
              </AnimatedPressable>
            </View>
          ) : (
            <>
              <VisitTypeSelector value={tipoVisita} disabled={guardando} error={errores.tipo}
                onChange={(value) => { setTipoVisita(value); limpiarError('tipo'); limpiarError('motivo'); }} />
              <AdaptiveColumns>
              <View style={styles.group}>
                <Text style={styles.label}>¿Qué mascota irá?</Text>
                {mascotas.map((mascota) => (
                  <AnimatedPressable key={mascota.id} accessibilityRole="radio" accessibilityState={{ checked: mascotaId === mascota.id, disabled: guardando }} disabled={guardando}
                    onPress={() => { setMascotaId(mascota.id); limpiarError('mascota'); }}
                    style={[styles.pet, mascotaId === mascota.id && styles.selected]}>
                    <Ionicons name={mascotaId === mascota.id ? 'radio-button-on' : 'radio-button-off'} size={22} color={AppColors.accent} />
                    <Text style={styles.petName}>{mascota.nombre}</Text>
                    <Text style={styles.description}>{mascota.especie}</Text>
                  </AnimatedPressable>
                ))}
                {!!errores.mascota && <Text style={styles.error} accessibilityRole="alert">{errores.mascota}</Text>}
              </View>
              <View style={styles.group}>
                <Text style={styles.label}>Fecha de la visita</Text>
                <FormInput editable={!guardando} dateMode="date" icon="calendar-outline" accessibilityLabel="Fecha de la visita, día mes y año" placeholder="DD/MM/AAAA"
                  value={fecha} maxLength={10} onChangeText={(value) => { setFecha(value); limpiarError('fecha'); }} />
              </View>
              <View style={styles.group}>
                <Text style={styles.label}>Hora de la visita</Text>
                <FormInput editable={!guardando} dateMode="time" icon="time-outline" accessibilityLabel="Hora de la visita, formato de 24 horas" placeholder="HH:MM, por ejemplo 15:30"
                  value={hora} maxLength={5} onChangeText={(value) => { setHora(value); limpiarError('fecha'); }} />
                <Text style={styles.description}>Formato de 24 horas. Se usa la hora local de tu dispositivo.</Text>
                {!!errores.fecha && <Text style={styles.error} accessibilityRole="alert">{errores.fecha}</Text>}
              </View>
              </AdaptiveColumns>
              <View style={styles.group}>
                <Text style={styles.label}>Motivo u observaciones {tipoVisita === 'otro' ? '(obligatorio)' : '(opcional)'}</Text>
                <FormInput editable={!guardando} accessibilityLabel="Motivo u observaciones de la visita"
                  placeholder={tipoVisita === 'consulta_malestar' ? 'Describe lo que has observado en tu mascota' : 'Por ejemplo: vacuna antirrábica o revisión anual'}
                  value={motivo} onChangeText={(value) => { setMotivo(value); limpiarError('motivo'); }}
                  multiline maxLength={200} style={styles.reason} error={errores.motivo} />
                <Text style={styles.description}>{motivo.length}/200 caracteres</Text>
              </View>
              <Text style={styles.description}>{modoDemo
                ? 'La visita y su recordatorio estarán disponibles durante esta sesión de demostración.'
                : 'La visita y su recordatorio se guardarán en tu cuenta y aparecerán en la agenda.'}</Text>
              {!!errores.general && <Text style={styles.error} accessibilityRole="alert">{errores.general}</Text>}
              <AnimatedPressable style={[styles.button, guardando && styles.disabled]} onPress={guardar} disabled={guardando}
                accessibilityRole="button" accessibilityState={{ disabled: guardando, busy: guardando }}>
                <Text style={styles.buttonText}>{guardando ? 'Guardando…' : 'Guardar visita'}</Text>
              </AnimatedPressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </PetScreen>
  );
}

const createStyles = (AppColors: AppPalette) => (StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: AppColors.text },
  content: { padding: 20, gap: 22, paddingBottom: 40, width: '100%', maxWidth: 800, alignSelf: 'center' },
  group: { gap: 10 },
  label: { fontSize: 16, fontWeight: '700', color: AppColors.text },
  description: { fontSize: 14, lineHeight: 21, color: AppColors.textSecondary },
  pet: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: AppColors.border, backgroundColor: AppColors.surface },
  selected: { borderColor: AppColors.primaryDark, backgroundColor: AppColors.infoSoft },
  petName: { flex: 1, fontSize: 16, fontWeight: '600', color: AppColors.text },
  reason: { flex: 1, minHeight: 120, paddingVertical: 14, fontSize: 15, color: AppColors.text, textAlignVertical: 'top' },
  error: { fontSize: 14, color: AppColors.danger },
  button: { backgroundColor: AppColors.primaryDark, borderRadius: 16, padding: 16, alignItems: 'center' },
  disabled: { opacity: 0.6 },
  buttonText: { color: AppColors.onPrimary, fontWeight: '700', fontSize: 16 },
}));
