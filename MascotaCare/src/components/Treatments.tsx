import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useAhora } from '@/hooks/use-ahora';
import type { EstadoToma, Tratamiento } from '@/types';
import { AppColors } from '@/constants/theme';
import { formatearFechaCita } from '@/utils/estados';
import FormInput from './FormInput';
import TimeSchedule from './TimeSchedule';

export default function Treatments({ mascotaId, nombre }: { mascotaId: number; nombre: string }) {
  const { tratamientos } = useAuth();
  const [creando, setCreando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const lista = tratamientos.filter((t) => t.mascota_id === mascotaId);
  return <View style={styles.section}>
    <Text style={styles.title}>Tratamientos y medicamentos</Text>
    <Text style={styles.text}>Indicaciones y registro de tomas de {nombre}.</Text>
    {creando ? <Formulario mascotaId={mascotaId} cerrar={(guardado) => {
      setCreando(false); setMensaje(guardado ? 'Tratamiento guardado para esta sesión.' : '');
    }} /> : <Boton label="Añadir tratamiento" onPress={() => { setMensaje(''); setCreando(true); }} />}
    {!!mensaje && <Text accessibilityRole="alert" style={styles.text}>{mensaje}</Text>}
    {!lista.length && !creando && <Text style={styles.text}>Aún no hay tratamientos registrados.</Text>}
    {lista.map((t) => <TratamientoCard key={t.id} tratamiento={t} />)}
  </View>;
}

function Formulario({ mascotaId, cerrar }: { mascotaId: number; cerrar: (guardado: boolean) => void }) {
  const { agregarTratamiento } = useAuth();
  const [medicamento, setMedicamento] = useState('');
  const [indicaciones, setIndicaciones] = useState('');
  const [inicio, setInicio] = useState('');
  const [duracion, setDuracion] = useState('');
  const [horarios, setHorarios] = useState('');
  const [error, setError] = useState('');
  const guardar = () => {
    if (!/^\d+$/.test(duracion.trim())) { setError('Escribe la duración en días completos.'); return; }
    try {
      agregarTratamiento({ mascota_id: mascotaId, medicamento, indicaciones, inicio,
        duracion_dias: Number(duracion), horarios: horarios.split(',') });
      cerrar(true);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar.'); }
  };
  return <View style={styles.card}>
    <Text style={styles.label}>Medicamento</Text>
    <FormInput accessibilityLabel="Medicamento" placeholder="Nombre del medicamento" value={medicamento} onChangeText={setMedicamento} maxLength={120} />
    <Text style={styles.label}>Indicaciones del veterinario</Text>
    <FormInput accessibilityLabel="Indicaciones del veterinario" placeholder="Transcribe la dosis, vía de administración y demás indicaciones" value={indicaciones} onChangeText={setIndicaciones} multiline maxLength={2000} />
    <Text style={styles.label}>Fecha de inicio</Text>
    <FormInput dateMode="date" accessibilityLabel="Fecha de inicio" placeholder="DD/MM/AAAA" value={inicio} onChangeText={setInicio} maxLength={10} />
    <Text style={styles.label}>Duración en días</Text>
    <FormInput accessibilityLabel="Duración en días" placeholder="Número de días indicado" value={duracion} onChangeText={setDuracion} keyboardType="number-pad" maxLength={3} />
    <Text style={styles.label}>Horarios diarios (24 horas)</Text>
    <TimeSchedule value={horarios} onChange={setHorarios} />
    <Text style={styles.text}>Se generará una toma por horario cada día, desde la fecha de inicio. Usa los horarios indicados por el veterinario y la hora local de tu dispositivo.</Text>
    <Text style={styles.text}>Los datos se conservan durante esta sesión.</Text>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <Boton label="Guardar tratamiento" onPress={guardar} />
    <Boton label="Cancelar" onPress={() => cerrar(false)} />
  </View>;
}

function TratamientoCard({ tratamiento: t }: { tratamiento: Tratamiento }) {
  const { marcarToma } = useAuth();
  const ahora = useAhora();
  const [dia, setDia] = useState(() => {
    const inicio = new Date(t.tomas[0].fecha_hora);
    const hoy = new Date();
    const dias = Math.round((Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) - Date.UTC(inicio.getFullYear(), inicio.getMonth(), inicio.getDate())) / 86400000);
    return Math.max(0, Math.min(t.duracion_dias - 1, dias));
  });
  const [mensaje, setMensaje] = useState('');
  const tomas = t.tomas.slice(dia * t.horarios.length, (dia + 1) * t.horarios.length);
  const administradas = t.tomas.filter((toma) => toma.estado === 'administrada').length;
  const omitidas = t.tomas.filter((toma) => toma.estado === 'omitida').length;
  const sinRegistrar = t.tomas.filter((toma) => toma.estado === 'pendiente' && new Date(toma.fecha_hora).getTime() <= ahora).length;
  const marcar = (fecha: string, estado: EstadoToma) => {
    try {
      marcarToma(t.id, fecha, estado);
      setMensaje(estado === 'pendiente' ? 'Registro deshecho.' : `Toma marcada como ${estado}.`);
    } catch (err) { setMensaje(err instanceof Error ? err.message : 'No se pudo registrar la toma.'); }
  };
  return <View style={styles.card}>
    <Text style={styles.title}>{t.medicamento}</Text>
    <Text style={styles.label}>Indicaciones del veterinario</Text>
    <Text style={styles.text}>{t.indicaciones}</Text>
    <Text style={styles.text}>Inicio: {t.inicio} · {t.duracion_dias} días</Text>
    <Text style={styles.text}>Horarios: {t.horarios.join(' · ')}</Text>
    <Text style={styles.text}>{administradas} administradas · {omitidas} omitidas · {sinRegistrar} sin registrar hasta ahora</Text>
    <Text style={styles.label}>Día {dia + 1} de {t.duracion_dias} · {new Date(tomas[0].fecha_hora).toLocaleDateString('es-PE')}</Text>
    <View style={styles.actions}>
      <Boton label="Día anterior" disabled={dia === 0} onPress={() => { setDia(dia - 1); setMensaje(''); }} />
      <Boton label="Día siguiente" disabled={dia === t.duracion_dias - 1} onPress={() => { setDia(dia + 1); setMensaje(''); }} />
    </View>
    {!!mensaje && <Text accessibilityRole="alert" style={styles.text}>{mensaje}</Text>}
    {tomas.map((toma) => {
      const futura = new Date(toma.fecha_hora).getTime() > ahora;
      return <View key={toma.fecha_hora} style={styles.dose}>
        <Text style={styles.label}>{formatearFechaCita(toma.fecha_hora)}</Text>
        <Text style={[styles.text, toma.estado === 'administrada' && styles.success, toma.estado === 'omitida' && styles.error]}>
          {toma.estado === 'pendiente' ? (futura ? 'Programada' : 'Pendiente de registrar') : toma.estado === 'administrada' ? 'Administrada' : 'Omitida'}
        </Text>
        {!!toma.registrada_en && <Text style={styles.text}>Registrada: {new Date(toma.registrada_en).toLocaleString('es-PE')}</Text>}
        {toma.estado === 'pendiente' ? <View style={styles.actions}>
          <Boton label="Administrada" disabled={futura} onPress={() => marcar(toma.fecha_hora, 'administrada')} />
          <Boton label="Omitida" disabled={futura} onPress={() => marcar(toma.fecha_hora, 'omitida')} />
        </View> : <Boton label="Deshacer registro" onPress={() => marcar(toma.fecha_hora, 'pendiente')} />}
      </View>;
    })}
  </View>;
}

function Boton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.button, disabled && styles.disabled]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
}
const styles = StyleSheet.create({
  section: { gap: 14, marginTop: 8 },
  card: { gap: 12, padding: 14, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 14, backgroundColor: AppColors.surface },
  title: { fontSize: 18, fontWeight: '700', color: AppColors.text },
  label: { fontSize: 15, fontWeight: '600', color: AppColors.text },
  text: { fontSize: 14, lineHeight: 21, color: AppColors.textSecondary },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dose: { gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  button: { backgroundColor: '#0369A1', padding: 12, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  disabled: { opacity: 0.45 },
  error: { color: '#B91C1C' },
  success: { color: '#15803D' },
});
