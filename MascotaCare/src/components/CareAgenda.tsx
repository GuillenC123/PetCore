import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useAhora } from '@/hooks/use-ahora';
import { crearAgenda, filtrarAgenda, type FiltroAgenda } from '@/utils/agenda';
import { fechaRecordatorio } from '@/utils/recordatorios';
import { useAccionGuardado } from '@/hooks/use-accion-guardado';
import SaveFeedback from './SaveFeedback';

export default function CareAgenda({ initialFilter = 'Hoy', compact = false }: { initialFilter?: FiltroAgenda; compact?: boolean }) {
  const { mascotas, citas, tratamientos, recordatorios, marcarToma, tacharRecordatorio, completarCita } = useAuth();
  const ahora = useAhora();
  const [filtro, setFiltro] = useState<FiltroAgenda>(initialFilter);
  const [mascotaId, setMascotaId] = useState<number | null>(null);
  const guardado = useAccionGuardado();
  const [limite, setLimite] = useState(30);
  const [abierto, setAbierto] = useState<string | null>(null);
  const todos = crearAgenda(citas, tratamientos, recordatorios);
  const eventos = compact ? todos.filter((e) => { const fin = new Date(ahora); fin.setHours(23, 59, 59, 999); return Date.parse(e.fecha) <= fin.getTime(); }) : filtrarAgenda(todos, filtro, mascotaId, ahora);
  const sinFecha = recordatorios.filter((r) => !r.completado && !fechaRecordatorio(r.vence_en) && (mascotaId === null || mascotaId === r.mascota_id)).length;
  const ejecutar = guardado.ejecutar;
  return <View style={styles.section}>
    {!compact && <><View style={styles.options}>{(['Hoy', 'Esta semana', 'Vencidos', 'Todos'] as FiltroAgenda[]).map((f) =>
      <Opcion key={f} label={f} activo={filtro === f} onPress={() => { setFiltro(f); setLimite(30); }} />)}</View>
    <Text style={styles.text}>Esta semana comprende de lunes a domingo. Vencidos muestra los cuidados pendientes cuyo horario ya pasó.</Text>
    <View style={styles.options}>{[{ id: null, nombre: 'Todas las mascotas' }, ...mascotas].map((m) =>
      <Opcion key={m.id ?? 'todas'} label={m.nombre} activo={m.id === mascotaId} onPress={() => { setMascotaId(m.id); setLimite(30); }} />)}</View></>}
    <SaveFeedback {...guardado} />
    {sinFecha > 0 && <Boton label={`${sinFecha} recordatorios sin fecha: revisar`} onPress={() => router.push('/recordatorios')} />}
    {!compact && <Text style={styles.label}>{eventos.length} cuidados pendientes</Text>}
    {!eventos.length && <Text style={styles.text}>No hay cuidados pendientes para este filtro.</Text>}
    {eventos.slice(0, compact ? 3 : limite).map((e) => <View key={e.clave} style={styles.card}>
      <Text style={styles.label}>{e.tipo === 'cita' ? 'Visita veterinaria' : e.tipo === 'medicamento' ? 'Medicamento' : 'Recordatorio'} · {mascotas.find((m) => m.id === e.mascota_id)?.nombre ?? 'Sin mascota'}</Text>
      <Text style={styles.label} numberOfLines={compact && abierto !== e.clave ? 2 : undefined}>{e.titulo}</Text>
      <Text style={styles.text}>{new Date(e.fecha).toLocaleString('es-PE')}</Text>
      {(!compact || abierto === e.clave) && !!e.detalle && <Text style={styles.text}>{e.detalle}</Text>}
      {Date.parse(e.fecha) < ahora && <Text style={styles.overdue}>Vencido · pendiente de registrar</Text>}
      {compact && <Pressable accessibilityRole="button" accessibilityState={{ expanded: abierto === e.clave }} onPress={() => setAbierto(abierto === e.clave ? null : e.clave)} style={{ paddingVertical: 10 }}><Text style={{ color: '#0369A1', fontWeight: '600' }}>{abierto === e.clave ? 'Cerrar acciones' : 'Ver detalle y registrar'}</Text></Pressable>}
      {(!compact || abierto === e.clave) && <>
      {e.tipo === 'cita' && <Boton label="Marcar visita realizada" disabled={guardado.guardando || Date.parse(e.fecha) > ahora} onPress={() => ejecutar(() => completarCita(e.id))} />}
      {e.tipo === 'medicamento' && <View style={styles.options}>
        <Boton label="Administrada" disabled={guardado.guardando || Date.parse(e.fecha) > ahora} onPress={() => ejecutar(() => marcarToma(e.id, e.fecha, 'administrada'))} />
        <Boton label="Omitida" disabled={guardado.guardando || Date.parse(e.fecha) > ahora} onPress={() => ejecutar(() => marcarToma(e.id, e.fecha, 'omitida'))} />
      </View>}
      {e.tipo === 'recordatorio' && <>
        <Boton label="Completar recordatorio" disabled={guardado.guardando} onPress={() => ejecutar(() => tacharRecordatorio(e.id, true))} />
        <Boton label="Editar o posponer" onPress={() => router.push('/recordatorios')} />
      </>}
      </>}
    </View>)}
    {compact ? <Boton label="Ver agenda completa" onPress={() => router.push('/citas')} /> : eventos.length > limite && <Boton label="Ver más cuidados" onPress={() => setLimite(limite + 30)} />}
  </View>;
}
function Boton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.button, disabled && { opacity: 0.45 }]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
}
function Opcion({ label, activo, onPress }: { label: string; activo: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: activo }} onPress={onPress} style={[styles.option, activo && { backgroundColor: '#E0F2FE' }]}><Text>{label}</Text></Pressable>;
}
const styles = StyleSheet.create({
  section: { gap: 14 }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  label: { fontSize: 15, fontWeight: '700', color: '#111827' }, text: { fontSize: 14, lineHeight: 21, color: '#6B7280' },
  overdue: { color: '#B91C1C' }, card: { padding: 16, borderRadius: 14, backgroundColor: '#FFFFFF', gap: 12 },
  option: { padding: 12, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12 },
  button: { padding: 12, backgroundColor: '#0369A1', borderRadius: 12, alignItems: 'center' }, buttonText: { color: '#FFFFFF', fontWeight: '600' },
});
