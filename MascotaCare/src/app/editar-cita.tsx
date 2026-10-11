import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import FormInput from '@/components/FormInput';
import { layoutStyles } from '@/components/AdaptiveLayout';
import { AppColors } from '@/constants/theme';
import { useAviso } from '@/context/AvisosContext';
import { useAuth } from '@/context/AuthContext';
import { buscarPorId } from '@/utils/identificadores';
import { interpretarFechaVisita } from '@/utils/citas';

function fechaLocal(iso: string) {
  const fecha = new Date(iso);
  const dos = (valor: number) => String(valor).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

function horaLocal(iso: string) {
  const fecha = new Date(iso);
  return `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
}

export default function EditarCitaScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { citas, actualizarCita } = useAuth();
  const mostrarAviso = useAviso();
  const cita = buscarPorId(citas, id);
  const [motivo, setMotivo] = useState(() => cita?.titulo ?? '');
  const [fecha, setFecha] = useState(() => cita ? fechaLocal(cita.fecha_hora) : '');
  const [hora, setHora] = useState(() => cita ? horaLocal(cita.fecha_hora) : '');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    if (!cita || guardando) return;
    const fechaHora = interpretarFechaVisita(fecha, hora);
    if (!motivo.trim()) return setError('Describe el motivo de la visita.');
    if (!fechaHora || fechaHora.getTime() <= Date.now()) return setError('Selecciona una fecha y hora futuras.');
    setGuardando(true);
    setError('');
    try {
      await actualizarCita(cita.id, { titulo: motivo, fecha_hora: fechaHora.toISOString() });
      mostrarAviso('Visita actualizada.');
      router.replace('/citas');
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo actualizar la visita.');
    } finally {
      setGuardando(false);
    }
  };

  if (!cita) {
    return <SafeAreaView style={styles.safe}><View style={styles.content}>
      <Text style={styles.title}>Visita no encontrada</Text>
      <Text style={styles.description}>Actualiza la agenda e inténtalo nuevamente.</Text>
      <Pressable style={styles.button} onPress={() => router.replace('/citas')}><Text style={styles.buttonText}>Volver a citas</Text></Pressable>
    </View></SafeAreaView>;
  }

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
    <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.content, layoutStyles.form]} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color={AppColors.text} />
          </Pressable>
          <Text style={styles.title}>Editar visita</Text>
          <View style={styles.back} />
        </View>
        <Text style={styles.description}>La fecha y el motivo también actualizarán el recordatorio de esta visita.</Text>
        <FormInput icon="document-text-outline" label="Motivo" placeholder="Motivo de la visita" value={motivo} maxLength={200}
          onChangeText={(valor) => { setMotivo(valor); setError(''); }} />
        <FormInput dateMode="date" icon="calendar-outline" label="Fecha" placeholder="AAAA-MM-DD" value={fecha} maxLength={10}
          onChangeText={(valor) => { setFecha(valor); setError(''); }} />
        <FormInput dateMode="time" icon="time-outline" label="Hora" placeholder="HH:MM" value={hora} maxLength={5}
          onChangeText={(valor) => { setHora(valor); setError(''); }} />
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        <Pressable accessibilityRole="button" disabled={guardando} onPress={guardar} style={[styles.button, guardando && styles.disabled]}>
          <Text style={styles.buttonText}>{guardando ? 'Guardando…' : 'Guardar cambios'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.background },
  content: { padding: 20, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: AppColors.text },
  description: { fontSize: 14, lineHeight: 21, color: AppColors.textSecondary },
  error: { color: '#B91C1C', fontSize: 14 },
  button: { padding: 16, borderRadius: 16, backgroundColor: '#0369A1', alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  disabled: { opacity: 0.55 },
});
