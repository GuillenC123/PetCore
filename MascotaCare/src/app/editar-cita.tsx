import { useAppColors } from '@/context/AppearanceContext';
import type { AppPalette } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import AnimatedPressable from '@/components/AnimatedPressable';
import VisitTypeSelector from '@/components/VisitTypeSelector';
import PetScreen from '@/components/PetScreen';

import FormInput from '@/components/FormInput';
import { layoutStyles } from '@/components/AdaptiveLayout';
import { useAviso } from '@/context/AvisosContext';
import { useAuth } from '@/context/AuthContext';
import { buscarPorId } from '@/utils/identificadores';
import { interpretarFechaVisita } from '@/utils/citas';
import { esTipoVisita, etiquetaTipoVisita } from '@/utils/tipos-visita';
import type { TipoVisita } from '@/types';

function fechaLocal(iso: string) {
  const fecha = new Date(iso);
  const dos = (valor: number) => String(valor).padStart(2, '0');
  return `${dos(fecha.getDate())}/${dos(fecha.getMonth() + 1)}/${fecha.getFullYear()}`;
}

function horaLocal(iso: string) {
  const fecha = new Date(iso);
  return `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
}

export default function EditarCitaScreen() {
  const AppColors = useAppColors();
  const styles = createStyles(AppColors);

  const { id } = useLocalSearchParams<{ id?: string }>();
  const { citas, actualizarCita } = useAuth();
  const mostrarAviso = useAviso();
  const cita = buscarPorId(citas, id);
  const tipoGuardado = cita?.tipo_visita;
  const [tipoVisita, setTipoVisita] = useState<TipoVisita>(() => esTipoVisita(tipoGuardado) ? tipoGuardado : 'otro');
  const [motivo, setMotivo] = useState(() => cita?.titulo ?? '');
  const [fecha, setFecha] = useState(() => cita ? fechaLocal(cita.fecha_hora) : '');
  const [hora, setHora] = useState(() => cita ? horaLocal(cita.fecha_hora) : '');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const bloqueo = useRef(false);
  const volver = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/citas');
  };

  const guardar = async () => {
    if (!cita || bloqueo.current) return;
    const fechaHora = interpretarFechaVisita(fecha, hora);
    if (tipoVisita === 'otro' && !motivo.trim()) return setError('Describe el motivo de la visita.');
    if (!fechaHora || fechaHora.getTime() <= Date.now()) return setError('Selecciona una fecha y hora futuras.');
    bloqueo.current = true;
    setGuardando(true);
    setError('');
    try {
      await actualizarCita(cita.id, { titulo: motivo.trim() || etiquetaTipoVisita(tipoVisita), fecha_hora: fechaHora.toISOString(), tipo_visita: tipoVisita });
      mostrarAviso('Visita actualizada.');
      router.replace('/citas');
    } catch (causa) {
      bloqueo.current = false;
      setGuardando(false);
      setError(causa instanceof Error ? causa.message : 'No se pudo actualizar la visita.');
    }
  };

  if (!cita) {
    return <PetScreen style={styles.safe}><View style={styles.content}>
      <Text style={styles.title}>Visita no encontrada</Text>
      <Text style={styles.description}>Actualiza la agenda e inténtalo nuevamente.</Text>
      <AnimatedPressable style={styles.button} onPress={() => router.replace('/citas')}><Text style={styles.buttonText}>Volver a citas</Text></AnimatedPressable>
    </View></PetScreen>;
  }

  return <PetScreen style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.content, layoutStyles.form]} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <AnimatedPressable accessibilityRole="button" accessibilityLabel="Volver" onPress={volver} disabled={guardando} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color={AppColors.text} />
          </AnimatedPressable>
          <Text style={styles.title}>Editar visita</Text>
          <View style={styles.back} />
        </View>
        <Text style={styles.description}>La fecha y el motivo también actualizarán el recordatorio de esta visita.</Text>
        <VisitTypeSelector value={tipoVisita} disabled={guardando}
          onChange={(value) => { setTipoVisita(value); setError(''); }} />
        <FormInput editable={!guardando} dateMode="date" icon="calendar-outline" label="Fecha" placeholder="DD/MM/AAAA" value={fecha} maxLength={10}
          onChangeText={(valor) => { setFecha(valor); setError(''); }} />
        <FormInput editable={!guardando} dateMode="time" icon="time-outline" label="Hora" placeholder="HH:MM" value={hora} maxLength={5}
          onChangeText={(valor) => { setHora(valor); setError(''); }} />
        <FormInput editable={!guardando} icon="document-text-outline"
          label={`Motivo u observaciones ${tipoVisita === 'otro' ? '(obligatorio)' : '(opcional)'}`}
          placeholder="Añade detalles sobre la visita" value={motivo} maxLength={200}
          onChangeText={(valor) => { setMotivo(valor); setError(''); }} />
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        <AnimatedPressable accessibilityRole="button" accessibilityState={{ disabled: guardando, busy: guardando }} disabled={guardando} onPress={guardar} style={[styles.button, guardando && styles.disabled]}>
          <Text style={styles.buttonText}>{guardando ? 'Guardando…' : 'Guardar cambios'}</Text>
        </AnimatedPressable>
      </ScrollView>
    </KeyboardAvoidingView>
  </PetScreen>;
}

const createStyles = (AppColors: AppPalette) => (StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.background },
  content: { padding: 20, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: AppColors.text },
  description: { fontSize: 14, lineHeight: 21, color: AppColors.textSecondary },
  error: { color: AppColors.danger, fontSize: 14 },
  button: { padding: 16, borderRadius: 16, backgroundColor: AppColors.primaryDark, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '700', color: AppColors.onPrimary },
  disabled: { opacity: 0.55 },
}));
