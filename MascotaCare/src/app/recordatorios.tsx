// ============================================================================
// recordatorios.tsx - Pantalla Modal de Recordatorios
// ----------------------------------------------------------------------------
// Se abre como modal (desde la campana de cualquier pantalla). Muestra el
// título "Recordatorios" y la lista de tarjetas de recordatorio con su borde
// de color izquierdo y un checkbox para marcarlas como completadas.
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ReminderCard from '@/components/ReminderCard';
import ReminderForm from '@/components/ReminderForm';
import SaveFeedback from '@/components/SaveFeedback';
import { useAccionGuardado } from '@/hooks/use-accion-guardado';
import { useAhora } from '@/hooks/use-ahora';
import { fechaRecordatorio, ordenarRecordatorios } from '@/utils/recordatorios';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import type { Recordatorio } from '@/types';

export default function RecordatoriosScreen() {
  const { recordatorios, tacharRecordatorio, posponerRecordatorio } = useAuth();
  const ahora = useAhora();
  const [editor, setEditor] = useState<Recordatorio | 'nuevo' | null>(null);
  const [mensaje, setMensaje] = useState('');
  const guardado = useAccionGuardado();

  // Ordena: pendientes primero, completados al final.
  const ordenados = ordenarRecordatorios(recordatorios);
  const posponer = (r: Recordatorio, minutos: number) => {
    const base = Math.max(Date.now(), fechaRecordatorio(r.vence_en)?.getTime() ?? 0);
    const fecha = new Date(base);
    if (minutos === 1440) fecha.setDate(fecha.getDate() + 1);
    else fecha.setMinutes(fecha.getMinutes() + minutos);
    posponerRecordatorio(r.id, fecha.toISOString());
    setMensaje(r.cita_id !== undefined ? 'Aviso pospuesto. La fecha de la visita no cambia.' : 'Recordatorio pospuesto.');
  };

  // Al tocar el checkbox, cambiamos el estado completado del recordatorio.
  const manejarToggle = (recordatorio: Recordatorio) => {
    setMensaje('');
    void guardado.ejecutar(() => tacharRecordatorio(recordatorio.id, !recordatorio.completado));
  };

  const pendientes = recordatorios.filter((r) => !r.completado).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Cabecera del modal con botón de cierre. */}
      <View style={styles.header}>
        <Text style={styles.title}>Recordatorios</Text>
        <Pressable
          accessibilityRole="button" accessibilityLabel="Cerrar recordatorios"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
          <Ionicons name="close" size={24} color={AppColors.textSecondary} />
        </Pressable>
      </View>

      {/* Subtítulo informativo. */}
      <Text style={styles.subtitle}>
        Tienes {pendientes} recordatorio{pendientes !== 1 ? 's' : ''} pendiente
        {pendientes !== 1 ? 's' : ''}.
      </Text>

      {/* Lista de recordatorios. */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.empty}>Los cambios se conservan durante esta sesión.</Text>
        {!!mensaje && <Text accessibilityRole="alert" style={styles.empty}>{mensaje}</Text>}
        <SaveFeedback {...guardado} />
        {editor ? <ReminderForm key={editor === 'nuevo' ? 'nuevo' : editor.id} recordatorio={editor === 'nuevo' ? undefined : editor}
          cerrar={(texto) => { setEditor(null); setMensaje(texto ?? ''); }} /> : <>
        <Pressable accessibilityRole="button" style={styles.newButton} onPress={() => { setMensaje(''); setEditor('nuevo'); }}>
          <Text style={styles.newText}>Crear recordatorio</Text>
        </Pressable>
        {ordenados.length === 0 ? (
          <Text style={styles.empty}>No tienes recordatorios.</Text>
        ) : (
          ordenados.map((r) => (
            <ReminderCard key={r.id} recordatorio={r} disabled={guardado.guardando} onToggle={manejarToggle} ahora={ahora} onEdit={setEditor} onPostpone={posponer} />
          ))
        )}
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  newButton: { padding: 16, borderRadius: 14, backgroundColor: '#0369A1', alignItems: 'center' },
  newText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  safe: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: AppColors.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    paddingHorizontal: 20,
    paddingTop: 4,
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  empty: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginTop: 8,
  },
  pressed: {
    opacity: 0.7,
  },
});
