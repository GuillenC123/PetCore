import { useAppColors } from '@/context/AppearanceContext';
import AnimatedPressable from '@/components/AnimatedPressable';
import AnimatedSection from '@/components/AnimatedSection';
import type { AppPalette } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import type { Identificador } from '@/types';
import { useState } from 'react';
import { router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useAhora } from '@/hooks/use-ahora';
import { agruparAgenda, crearAgenda, filtrarAgenda, type EventoAgenda, type FiltroAgenda, type FiltroTipoAgenda } from '@/utils/agenda';
import { fechaRecordatorio } from '@/utils/recordatorios';
import { etiquetaTipoVisita } from '@/utils/tipos-visita';
import { useAccionGuardado } from '@/hooks/use-accion-guardado';
import SaveFeedback from './SaveFeedback';
import PetImage from './PetImage';
import { AdaptiveColumns } from './AdaptiveLayout';

type Icono = keyof typeof Ionicons.glyphMap;
const PERIODOS: { nombre: FiltroAgenda; icono: Icono }[] = [
  { nombre: 'Hoy', icono: 'sunny-outline' }, { nombre: 'Esta semana', icono: 'calendar-outline' },
  { nombre: 'Vencidos', icono: 'alert-circle-outline' }, { nombre: 'Todos', icono: 'list-outline' },
];
const TIPOS: { id: FiltroTipoAgenda; nombre: string; icono: Icono }[] = [
  { id: 'todos', nombre: 'Todos', icono: 'apps-outline' }, { id: 'cita', nombre: 'Visitas', icono: 'medical-outline' },
  { id: 'medicamento', nombre: 'Medicamentos', icono: 'medkit-outline' }, { id: 'recordatorio', nombre: 'Recordatorios', icono: 'notifications-outline' },
];
const createCuidados = (AppColors: AppPalette) => ({
  cita: { nombre: 'Visita veterinaria', icono: 'medical-outline' as Icono, color: AppColors.accent, fondo: AppColors.infoSoft },
  medicamento: { nombre: 'Medicamento', icono: 'medkit-outline' as Icono, color: AppColors.success, fondo: AppColors.successSoft },
  recordatorio: { nombre: 'Recordatorio', icono: 'notifications-outline' as Icono, color: AppColors.purple, fondo: AppColors.purpleSoft },
});

export default function CareAgenda({ initialFilter = 'Hoy', compact = false, eventoClave }: { initialFilter?: FiltroAgenda; compact?: boolean; eventoClave?: string }) {
  const AppColors = useAppColors();
  const CUIDADOS = createCuidados(AppColors);
  const styles = createStyles(AppColors);

  const { mascotas, citas, tratamientos, recordatorios, marcarToma, tacharRecordatorio, completarCita, cancelarCita } = useAuth();
  const ahora = useAhora();
  const [filtro, setFiltro] = useState<FiltroAgenda>(initialFilter);
  const [mascotaId, setMascotaId] = useState<Identificador | null>(null);
  const [tipo, setTipo] = useState<FiltroTipoAgenda>('todos');
  const guardado = useAccionGuardado();
  const [limite, setLimite] = useState(30);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [aplicacionPendiente, setAplicacionPendiente] = useState<{
    citaId: Identificador; mascotaId: Identificador; nombre: string;
  } | null>(null);
  const todos = crearAgenda(citas, tratamientos, recordatorios);
  const finHoy = new Date(ahora); finHoy.setHours(23, 59, 59, 999);
  const eventos = eventoClave ? todos.filter((evento) => evento.clave === eventoClave) : compact ? todos.filter((e) => Date.parse(e.fecha) <= finHoy.getTime()) : filtrarAgenda(todos, filtro, mascotaId, ahora, tipo);
  const visibles = eventos.slice(0, compact ? 3 : limite);
  const sinFecha = recordatorios.filter((r) => !r.completado && !fechaRecordatorio(r.vence_en) &&
    (mascotaId === null || mascotaId === r.mascota_id) && (tipo === 'todos' || tipo === 'recordatorio')).length;
  const hayFiltros = filtro !== 'Hoy' || mascotaId !== null || tipo !== 'todos';
  const limpiar = (periodo: FiltroAgenda = 'Hoy') => { setFiltro(periodo); setMascotaId(null); setTipo('todos'); setLimite(30); };
  const ejecutar = guardado.ejecutar;
  const marcarRealizada = (evento: EventoAgenda) => ejecutar(async () => {
    if (evento.tipo !== 'cita') return;
    await completarCita(evento.id);
    if (evento.mascota_id !== null && (evento.tipo_visita === 'vacunacion' || evento.tipo_visita === 'desparasitacion')) {
      setAplicacionPendiente({ citaId: evento.id, mascotaId: evento.mascota_id,
        nombre: mascotas.find((mascota) => mascota.id === evento.mascota_id)?.nombre ?? 'tu mascota' });
    }
  });

  const filtroAnimacion = JSON.stringify([filtro, mascotaId, tipo]);
  const tarjeta = (e: EventoAgenda, index: number) => {
    const cuidado = CUIDADOS[e.tipo];
    const mascota = mascotas.find((m) => m.id === e.mascota_id);
    const vencido = Date.parse(e.fecha) < ahora;
    const futuro = Date.parse(e.fecha) > ahora;
    const expandido = !compact || abierto === e.clave;
    const hora = new Date(e.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    return <AnimatedSection key={e.clave} replayKey={filtroAnimacion} delay={140 + Math.min(index, 4) * 55} style={[styles.card, { borderLeftColor: cuidado.color }]}>
      <View style={styles.cardTop}>
        <View style={[styles.careIcon, { backgroundColor: cuidado.fondo }]}><Ionicons name={cuidado.icono} color={cuidado.color} size={20} /></View>
        <Text style={[styles.careType, { color: cuidado.color }]}>{e.tipo === 'cita' ? etiquetaTipoVisita(e.tipo_visita) : cuidado.nombre}</Text>
        {vencido && <View style={styles.overdueBadge}><Text style={styles.overdueText}>Vencido</Text></View>}
      </View>
      <Text style={styles.eventTitle} numberOfLines={compact && !expandido ? 2 : undefined}>{e.titulo}</Text>
      <View style={styles.petRow}><Ionicons name="paw-outline" size={14} color={AppColors.textSecondary} /><Text style={styles.petName}>{mascota?.nombre ?? 'Sin mascota asociada'}</Text></View>
      <View style={styles.schedule}>
        <View style={styles.time}><Ionicons name="time-outline" size={16} color={AppColors.accent} /><Text style={styles.timeText}>{hora}</Text></View>
        <Text style={styles.date}>{new Date(e.fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
      </View>
      {expandido && !!e.detalle && <Text style={styles.description}>{e.detalle}</Text>}
      {compact && <AnimatedPressable accessibilityRole="button" accessibilityLabel={`Ver acciones de ${e.titulo}`}
        accessibilityState={{ expanded: expandido }} onPress={() => setAbierto(expandido ? null : e.clave)} style={styles.expand}>
        <Text style={styles.link}>{expandido ? 'Ocultar acciones' : 'Ver acciones'}</Text><Ionicons name={expandido ? 'chevron-up' : 'chevron-down'} size={16} color={AppColors.accent} />
      </AnimatedPressable>}
      {expandido && <View style={styles.cardActions}>
        {e.tipo === 'cita' && <View style={styles.actionRow}>
          {futuro
            ? <Boton label="Editar visita" icono="create-outline" disabled={guardado.guardando} onPress={() => router.push({ pathname: '/editar-cita' as never, params: { id: String(e.id) } })} />
            : <Boton label="Marcar realizada" icono="checkmark-circle-outline" disabled={guardado.guardando} onPress={() => marcarRealizada(e)} />}
          <Boton label="Cancelar visita" variante="danger" icono="close-circle-outline" disabled={guardado.guardando} onPress={() => Alert.alert(
            'Cancelar visita', 'La cita y su recordatorio dejarán de aparecer como pendientes.',
            [{ text: 'Volver', style: 'cancel' }, { text: 'Cancelar visita', style: 'destructive', onPress: () => ejecutar(() => cancelarCita(e.id)) }],
          )} />
        </View>}
        {e.tipo === 'medicamento' && <>
          {futuro && <Text style={styles.hint}>Podrás registrar esta toma cuando llegue su horario.</Text>}
          <View style={styles.actionRow}>
            <Boton label="Administrada" variante="success" icono="checkmark-outline" disabled={guardado.guardando || futuro} onPress={() => ejecutar(() => marcarToma(e.id, e.fecha, 'administrada'))} />
            <Boton label="Omitida" variante="secondary" icono="remove-outline" disabled={guardado.guardando || futuro} onPress={() => ejecutar(() => marcarToma(e.id, e.fecha, 'omitida'))} />
          </View>
        </>}
        {e.tipo === 'recordatorio' && <View style={styles.actionRow}>
          <Boton label="Completar" icono="checkmark-outline" disabled={guardado.guardando} onPress={() => ejecutar(() => tacharRecordatorio(e.id, true))} />
          <Boton label="Editar o posponer" variante="secondary" icono="create-outline" disabled={guardado.guardando} onPress={() => router.push('/recordatorios')} />
        </View>}
      </View>}
    </AnimatedSection>;
  };

  return <View style={styles.section}>
    {!compact && !eventoClave && <AnimatedSection delay={90} style={styles.filters}>
      <View style={styles.filterHeader}>
        <View style={styles.inline}><Ionicons name="options-outline" size={18} color={AppColors.accent} /><Text style={styles.filterTitle}>Filtrar cuidados</Text></View>
        {hayFiltros && <AnimatedPressable accessibilityRole="button" accessibilityLabel="Restablecer filtros de agenda" onPress={() => limpiar()} style={styles.reset}><Text style={styles.link}>Restablecer</Text></AnimatedPressable>}
      </View>
      <View style={styles.periods}>{PERIODOS.map(({ nombre, icono }) => {
        const activo = filtro === nombre;
        const cantidad = filtrarAgenda(todos, nombre, mascotaId, ahora, tipo).length;
        return <AnimatedPressable key={nombre} accessibilityRole="radio" accessibilityLabel={`${nombre}, ${cantidad} cuidados`}
          accessibilityState={{ checked: activo }} onPress={() => { setFiltro(nombre); setLimite(30); }}
          style={[styles.period, activo && styles.periodActive]}>
          <Ionicons name={icono} size={18} color={activo ? AppColors.onPrimary : AppColors.textSecondary} />
          <Text style={[styles.periodLabel, activo && styles.white]}>{nombre}</Text>
          <View style={[styles.counter, activo && styles.counterActive]}><Text style={[styles.counterText, activo && styles.white]}>{cantidad}</Text></View>
        </AnimatedPressable>;
      })}</View>
      <Text style={styles.filterLabel}>Mascota</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Opcion label="Todas" activo={mascotaId === null} icono="paw-outline" onPress={() => { setMascotaId(null); setLimite(30); }} />
        {mascotas.map((m) => <Opcion key={m.id} label={m.nombre} activo={m.id === mascotaId} imagen={m.imagen}
          icono="paw-outline" onPress={() => { setMascotaId(m.id); setLimite(30); }} />)}
      </ScrollView>
      <Text style={styles.filterLabel}>Tipo de cuidado</Text>
      <View style={styles.typeChips}>
        {TIPOS.map((opcion) => <Opcion key={opcion.id} label={opcion.nombre} icono={opcion.icono} activo={tipo === opcion.id} ampliar
          onPress={() => { setTipo(opcion.id); setLimite(30); }} />)}
      </View>
      <Text style={styles.hint}>{filtro === 'Esta semana' ? 'De lunes a domingo, incluidos los cuidados que ya vencieron.'
        : filtro === 'Vencidos' ? 'Cuidados pendientes cuyo horario previsto ya pasó.'
          : filtro === 'Hoy' ? 'Todos los cuidados de hoy, incluidos los que ya vencieron.' : 'Todos tus cuidados pendientes, ordenados por fecha.'}</Text>
    </AnimatedSection>}
    <SaveFeedback {...guardado} />
    {aplicacionPendiente && <View style={styles.applicationOffer}>
      <Text accessibilityRole="header" style={styles.resultTitle}>Visita de {aplicacionPendiente.nombre} realizada</Text>
      <Text style={styles.description}>Si se realizó la vacunación o desparasitación, puedes añadir la aplicación al carnet. El registro se guardará solo cuando lo confirmes.</Text>
      <View style={styles.actionRow}>
        <Boton label="Registrar aplicación en el carnet" icono="shield-checkmark-outline" onPress={() => {
          const pendiente = aplicacionPendiente;
          setAplicacionPendiente(null);
          router.push({ pathname: '/salud/[seccion]', params: { seccion: 'vacunas', mascotaId: String(pendiente.mascotaId), citaId: String(pendiente.citaId) } });
        }} />
        <Boton label="Más tarde" variante="secondary" icono="time-outline" onPress={() => setAplicacionPendiente(null)} />
      </View>
      <Text style={styles.hint}>También puedes retomarlo desde Ficha de salud → Vacunas y desparasitación.</Text>
    </View>}
    {!eventoClave && sinFecha > 0 && <AnimatedPressable accessibilityRole="button" onPress={() => router.push('/recordatorios')} style={styles.undated}>
      <View style={styles.undatedIcon}><Ionicons name="calendar-outline" size={20} color={AppColors.warning} /></View>
      <View style={styles.flex}><Text style={styles.undatedTitle}>{sinFecha} {sinFecha === 1 ? 'recordatorio sin fecha' : 'recordatorios sin fecha'}</Text><Text style={styles.hint}>Añade una fecha para verlo{sinFecha === 1 ? '' : 's'} en tu agenda.</Text></View>
      <Ionicons name="chevron-forward" size={18} color={AppColors.warning} />
    </AnimatedPressable>}
    {!compact && <View style={styles.results}>
      <Text accessibilityLiveRegion="polite" style={styles.resultTitle}>{eventos.length} {eventos.length === 1 ? 'cuidado pendiente' : 'cuidados pendientes'}</Text>
      <Text style={styles.hint}>Por fecha y hora</Text>
    </View>}
    {!eventos.length && <AnimatedSection delay={140} replayKey={filtroAnimacion} style={styles.empty}>
      <View style={styles.emptyIcon}><Ionicons name="checkmark-done-outline" size={28} color={AppColors.success} /></View>
      <Text style={styles.emptyTitle}>{eventoClave ? 'Este cuidado ya no está pendiente' : compact ? 'Todo al día por ahora' : 'Sin cuidados para estos filtros'}</Text>
      <Text style={styles.emptyDescription}>{eventoClave ? 'Puede haberse completado, eliminado o cambiado de fecha. Consulta la agenda para ver los cuidados actuales.' : compact ? 'No tienes cuidados de hoy ni vencidos por registrar.' : 'Puedes cambiar los filtros o añadir un nuevo cuidado.'}</Text>
      {!compact && hayFiltros && <AnimatedPressable accessibilityRole="button" onPress={() => limpiar('Todos')} style={styles.reset}><Text style={styles.link}>Ver todos los cuidados</Text></AnimatedPressable>}
    </AnimatedSection>}
    {compact ? <AdaptiveColumns singleColumn>{visibles.map(tarjeta)}</AdaptiveColumns>
      : agruparAgenda(visibles, ahora).map((grupo) => <View key={grupo.clave} style={styles.group}>
        <View style={styles.groupHeader}>
          <View style={[styles.groupDot, grupo.vencido && styles.groupDotOverdue]} />
          <Text style={[styles.groupTitle, grupo.vencido && styles.dangerText]}>{grupo.titulo}</Text>
          <Text style={styles.groupCount}>{grupo.eventos.length}</Text>
          <View style={styles.groupLine} />
        </View>
        <AdaptiveColumns>{grupo.eventos.map(tarjeta)}</AdaptiveColumns>
      </View>)}
    {compact ? <Boton label="Ver agenda completa" variante="secondary" icono="arrow-forward-outline" onPress={() => router.push('/citas')} />
      : eventos.length > limite && <Boton label={`Ver más cuidados (${eventos.length - limite})`} variante="secondary" icono="chevron-down" onPress={() => setLimite(limite + 30)} />}
  </View>;
}

function Boton({ label, onPress, disabled = false, variante = 'primary', icono }: {
  label: string; onPress: () => void; disabled?: boolean; variante?: 'primary' | 'secondary' | 'danger' | 'success'; icono: Icono;
}) {
  const AppColors = useAppColors();
  const styles = createStyles(AppColors);

  const claro = variante === 'secondary' || variante === 'danger';
  const color = variante === 'danger' ? AppColors.danger : claro ? AppColors.accent : AppColors.onPrimary;
  return <AnimatedPressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, variante === 'secondary' && styles.buttonSecondary, variante === 'danger' && styles.buttonDanger,
      variante === 'success' && styles.buttonSuccess, disabled && styles.disabled, pressed && !disabled && styles.pressed]}>
    <Ionicons name={icono} size={18} color={color} /><Text style={[styles.buttonText, { color }]}>{label}</Text>
  </AnimatedPressable>;
}

function Opcion({ label, activo, onPress, icono, imagen, ampliar = false }: { label: string; activo: boolean; onPress: () => void; icono: Icono; imagen?: string | null; ampliar?: boolean }) {
  const AppColors = useAppColors();
  const styles = createStyles(AppColors);

  return <AnimatedPressable accessibilityRole="radio" accessibilityState={{ checked: activo }} onPress={onPress} style={[styles.chip, ampliar && styles.typeChip, activo && styles.chipActive]}>
    {imagen ? <PetImage url={imagen} size={22} /> : <Ionicons name={icono} size={16} color={activo ? AppColors.accent : AppColors.textSecondary} />}
    <Text style={[styles.chipText, activo && styles.chipTextActive]}>{label}</Text>
    {activo && <Ionicons name="checkmark" size={14} color={AppColors.accent} />}
  </AnimatedPressable>;
}

const createStyles = (AppColors: AppPalette) => (StyleSheet.create({
  section: { gap: 18 }, flex: { flex: 1, minWidth: 0 }, inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filters: { padding: 16, gap: 12, borderRadius: 20, backgroundColor: AppColors.surface, borderWidth: 1, borderColor: AppColors.border },
  filterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 },
  filterTitle: { fontSize: 15, fontWeight: '700', color: AppColors.text },
  reset: { minHeight: 44, paddingHorizontal: 4, justifyContent: 'center' },
  link: { fontSize: 14, fontWeight: '600', color: AppColors.accent },
  filterLabel: { fontSize: 12, fontWeight: '700', color: AppColors.textSecondary, letterSpacing: 0.4 },
  periods: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  period: { flexGrow: 1, flexBasis: 130, minHeight: 50, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: AppColors.surfaceMuted, borderWidth: 1, borderColor: AppColors.surfaceMuted },
  periodActive: { backgroundColor: AppColors.primaryDark, borderColor: AppColors.primaryDark },
  periodLabel: { flex: 1, color: AppColors.textSecondary, fontSize: 13, fontWeight: '600' },
  white: { color: AppColors.onPrimary }, counter: { minWidth: 24, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 7, backgroundColor: AppColors.border, alignItems: 'center' },
  counterActive: { backgroundColor: '#FFFFFF26' }, counterText: { fontSize: 12, fontWeight: '700', color: AppColors.textSecondary },
  chips: { gap: 8, paddingRight: 8 }, typeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, typeChip: { flexGrow: 1, flexBasis: 130 },
  chip: { minHeight: 44, paddingHorizontal: 13, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 24, borderWidth: 1, borderColor: AppColors.border, backgroundColor: AppColors.surface },
  chipActive: { borderColor: AppColors.primaryDark, backgroundColor: AppColors.infoSoft }, chipText: { fontSize: 13, color: AppColors.textSecondary, flexShrink: 1 }, chipTextActive: { color: AppColors.accent, fontWeight: '700' },
  hint: { fontSize: 12, lineHeight: 18, color: AppColors.textSecondary },
  results: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
  resultTitle: { color: AppColors.text, fontSize: 16, fontWeight: '700' },
  applicationOffer: { padding: 18, gap: 12, borderRadius: 18, backgroundColor: AppColors.infoSoft, borderWidth: 1, borderColor: AppColors.border },
  group: { gap: 12 }, groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  groupDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: AppColors.primaryDark }, groupDotOverdue: { backgroundColor: AppColors.danger },
  groupTitle: { fontSize: 16, fontWeight: '700', color: AppColors.text }, groupCount: { fontSize: 12, fontWeight: '600', color: AppColors.textSecondary, backgroundColor: AppColors.border, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  groupLine: { height: 1, backgroundColor: AppColors.border, flex: 1 }, dangerText: { color: AppColors.danger },
  card: { padding: 18, borderRadius: 18, backgroundColor: AppColors.surface, borderWidth: 1, borderColor: AppColors.border, borderLeftWidth: 3, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 }, careIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  careType: { flex: 1, fontSize: 12, fontWeight: '700' }, overdueBadge: { backgroundColor: AppColors.dangerSoft, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7 }, overdueText: { fontSize: 11, fontWeight: '700', color: AppColors.danger },
  eventTitle: { fontSize: 18, fontWeight: '700', color: AppColors.text, lineHeight: 25 }, petRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, petName: { fontSize: 13, color: AppColors.textSecondary, flexShrink: 1 },
  schedule: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 }, time: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, backgroundColor: AppColors.infoSoft },
  timeText: { fontSize: 13, color: AppColors.accent, fontWeight: '700' }, date: { color: AppColors.textSecondary, fontSize: 12 }, description: { fontSize: 14, lineHeight: 21, color: AppColors.textSecondary },
  cardActions: { gap: 10, paddingTop: 12, marginTop: 2, borderTopWidth: 1, borderTopColor: AppColors.surfaceMuted }, actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { flexGrow: 1, minWidth: 132, minHeight: 46, paddingHorizontal: 13, paddingVertical: 12, borderRadius: 11, borderWidth: 1, borderColor: AppColors.primaryDark, backgroundColor: AppColors.primaryDark, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  buttonText: { fontSize: 13, fontWeight: '700', flexShrink: 1, textAlign: 'center' }, buttonSecondary: { backgroundColor: AppColors.surface, borderColor: AppColors.border },
  buttonDanger: { backgroundColor: AppColors.surface, borderColor: AppColors.dangerSoft }, buttonSuccess: { backgroundColor: AppColors.primaryDark, borderColor: AppColors.primaryDark }, disabled: { opacity: 0.4 }, pressed: { opacity: 0.75 },
  expand: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: AppColors.surfaceMuted, paddingTop: 8 },
  undated: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: AppColors.warningSoft, borderWidth: 1, borderColor: AppColors.warning }, undatedIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  undatedTitle: { fontSize: 13, fontWeight: '700', color: AppColors.warning, marginBottom: 3 },
  empty: { alignItems: 'center', padding: 28, gap: 10, borderRadius: 18, backgroundColor: AppColors.surface, borderWidth: 1, borderColor: AppColors.border },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: AppColors.successSoft }, emptyTitle: { color: AppColors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' }, emptyDescription: { fontSize: 14, lineHeight: 21, textAlign: 'center', color: AppColors.textSecondary },
}));
