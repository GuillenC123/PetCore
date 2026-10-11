import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import FormInput from './FormInput';
import { useAuth } from '@/context/AuthContext';
import { AppColors } from '@/constants/theme';
import type { Identificador, Recordatorio, TipoRecordatorio  } from '@/types';
import { interpretarFechaVisita } from '@/utils/citas';
import { fechaRecordatorio, REPETICIONES } from '@/utils/recordatorios';

export default function ReminderForm({ recordatorio, cerrar }: { recordatorio?: Recordatorio; cerrar: (mensaje?: string) => void }) {
  const { mascotas, guardarRecordatorio } = useAuth();
  const inicial = fechaRecordatorio(recordatorio?.vence_en ?? null);
  const [titulo, setTitulo] = useState(recordatorio?.titulo ?? '');
  const [descripcion, setDescripcion] = useState(recordatorio?.descripcion ?? '');
  const [mascotaId, setMascotaId] = useState<Identificador | null>(recordatorio?.mascota_id ?? null);
  const [tipo, setTipo] = useState<TipoRecordatorio>(recordatorio?.tipo ?? 'general');
  const [repeticion, setRepeticion] = useState(recordatorio?.repeticion ?? 'ninguna');
  const [fecha, setFecha] = useState(inicial ? `${String(inicial.getDate()).padStart(2, '0')}/${String(inicial.getMonth() + 1).padStart(2, '0')}/${inicial.getFullYear()}` : '');
  const [hora, setHora] = useState(inicial ? `${String(inicial.getHours()).padStart(2, '0')}:${String(inicial.getMinutes()).padStart(2, '0')}` : '');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const vinculadoACita = recordatorio?.cita_id != null;

  const guardar = async () => {
    if (guardando) return;
    const fechaElegida = interpretarFechaVisita(fecha, hora);
    if (!fechaElegida) { setError('Selecciona la fecha y la hora del recordatorio.'); return; }
    try {
      setGuardando(true);
      await guardarRecordatorio({ titulo, descripcion: descripcion.trim() || null, mascota_id: mascotaId, tipo,
        repeticion, vence_en: fechaElegida.toISOString() }, recordatorio?.id);
      cerrar('Recordatorio guardado.');
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar.'); }
    finally { setGuardando(false); }
  };

  return (
    <View style={styles.form}>
      <Text style={styles.title}>{recordatorio ? 'Editar recordatorio' : 'Nuevo recordatorio'}</Text>
      <Text style={styles.label}>Título</Text>
      <FormInput editable={!guardando} accessibilityLabel="Título" value={titulo} onChangeText={setTitulo} maxLength={200} placeholder="Ej. Comprar alimento" />
      <Text style={styles.label}>Descripción (opcional)</Text>
      <FormInput editable={!guardando} accessibilityLabel="Descripción" value={descripcion} onChangeText={setDescripcion} multiline maxLength={300} placeholder="Añade los detalles" />
      <Text style={styles.label}>Mascota</Text>
      <View style={styles.options}>
        {[{ id: null, nombre: 'Sin mascota' }, ...mascotas].map((m) => (
          <Opcion key={m.id ?? 'general'} label={m.nombre} activo={mascotaId === m.id} disabled={vinculadoACita || guardando} onPress={() => setMascotaId(m.id)} />
        ))}
      </View>
      <Text style={styles.label}>Tipo</Text>
      <View style={styles.options}>
        {(Object.entries({ general: 'General', vacuna: 'Vacuna', alimento: 'Alimento', cita: 'Cita', dosis: 'Dosis' }) as [TipoRecordatorio, string][]).map(([value, label]) => (
          <Opcion key={value} label={label} activo={tipo === value} disabled={vinculadoACita || guardando} onPress={() => setTipo(value)} />
        ))}
      </View>
      <Text style={styles.label}>Fecha del aviso</Text>
      <FormInput dateMode="date" accessibilityLabel="Fecha del aviso" value={fecha} onChangeText={setFecha} maxLength={10} placeholder="DD/MM/AAAA" />
      <Text style={styles.label}>Hora local (24 horas)</Text>
      <FormInput dateMode="time" accessibilityLabel="Hora del aviso" value={hora} onChangeText={setHora} maxLength={5} placeholder="HH:MM" />
      <Text style={styles.label}>Repetir</Text>
      <View style={styles.options}>
        {(Object.entries(REPETICIONES) as [NonNullable<Recordatorio['repeticion']>, string][]).map(([value, label]) => (
          <Opcion key={value} label={label} activo={repeticion === value} disabled={guardando} onPress={() => setRepeticion(value)} />
        ))}
      </View>
      {repeticion !== 'ninguna' && <Text>Al completar, se programará la siguiente fecha futura.</Text>}
      {vinculadoACita && <Text>La mascota y el tipo pertenecen a la cita y no se pueden cambiar.</Text>}
      {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
      <Pressable disabled={guardando} accessibilityState={{ disabled: guardando, busy: guardando }} accessibilityRole="button" style={styles.button} onPress={guardar}><Text style={styles.buttonText}>{guardando ? 'Guardando…' : 'Guardar recordatorio'}</Text></Pressable>
      <Pressable disabled={guardando} accessibilityRole="button" style={styles.button} onPress={() => cerrar()}><Text style={styles.buttonText}>Cancelar</Text></Pressable>
    </View>
  );
}

function Opcion({ label, activo, disabled = false, onPress }: { label: string; activo: boolean; disabled?: boolean; onPress: () => void }) {
  return <Pressable disabled={disabled} accessibilityRole="radio" accessibilityState={{ checked: activo, disabled }} onPress={onPress} style={[styles.option, activo && styles.active]}><Text>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  form: { gap: 12, padding: 16, backgroundColor: AppColors.surface, borderRadius: 16 },
  title: { fontSize: 20, fontWeight: '700', color: AppColors.text },
  label: { fontSize: 15, fontWeight: '600', color: AppColors.text },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#D1D5DB' },
  active: { backgroundColor: AppColors.infoSoft, borderColor: '#0369A1' },
  button: { padding: 14, backgroundColor: '#0369A1', borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
  error: { color: '#B91C1C' },
});
