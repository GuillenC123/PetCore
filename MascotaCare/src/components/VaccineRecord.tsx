import { useAppColors } from '@/context/AppearanceContext';
import type { AppPalette } from '@/constants/theme';
import { useRef, useState } from 'react';
import { useFormularioSalud } from '@/context/HealthEditContext';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PhotoField from './PhotoField';
import type { Identificador, Mascota, RegistroCarnet  } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useAhora } from '@/hooks/use-ahora';
import { estadoProximo, pendientesCarnet } from '@/utils/carnet';
import { interpretarFechaVisita } from '@/utils/citas';
import { fechaPesoHoy } from '@/utils/peso';
import Badge from './Badge';
import FormInput from './FormInput';

type Edicion = { datos?: RegistroCarnet; aplicar?: boolean; anterior?: RegistroCarnet };
const tipoLabel = (r: RegistroCarnet) => r.tipo === 'vacuna' ? 'Vacuna' : 'Desparasitación';

export default function VaccineRecord({ mascota }: { mascota: Mascota }) {
  const AppColors = useAppColors();
  const styles = createStyles(AppColors);

  const ahora = useAhora();
  const [editor, setEditor] = useState<Edicion | null>(null);
  const [foto, setFoto] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState('');
  const registros = mascota.carnet ?? [];
  const pendientes = pendientesCarnet(registros);
  const aplicados = registros.filter((r) => r.fecha_aplicacion).sort((a, b) =>
    interpretarFechaVisita(b.fecha_aplicacion!, '00:00')!.getTime() - interpretarFechaVisita(a.fecha_aplicacion!, '00:00')!.getTime());
  return <View style={styles.section}>
    <Text style={styles.title}>Carnet de vacunas y desparasitación</Text>
    {editor ? <Formulario mascotaId={mascota.id} edicion={editor} cerrar={(guardado) => { setEditor(null); setMensaje(guardado ? 'Carnet guardado.' : ''); }} /> : <>
      <Boton label="Añadir registro" onPress={() => { setMensaje(''); setEditor({}); }} />
      {!!mensaje && <Text accessibilityRole="alert" style={styles.text}>{mensaje}</Text>}
      <Text style={styles.label}>Próximas aplicaciones</Text>
      {!pendientes.length && <Text style={styles.text}>No hay próximas fechas registradas.</Text>}
      {pendientes.map((r) => {
        const estado = estadoProximo(r.proxima_fecha!, new Date(ahora));
        return <View key={r.id} style={styles.card}>
          <Badge label={estado} tone={estado === 'Vencido' ? 'danger' : 'info'} />
          <Text style={styles.label}>{r.nombre}</Text>
          <Text style={styles.text}>{tipoLabel(r)} · {r.proxima_fecha}</Text>
          {!r.fecha_aplicacion && r.comprobante && <Boton label="Ver comprobante" onPress={() => setFoto(r.comprobante)} />}
          <Boton label="Registrar aplicación" onPress={() => setEditor(r.fecha_aplicacion ? { anterior: r, aplicar: true } : { datos: r, aplicar: true })} />
          <Boton label="Editar registro" onPress={() => setEditor({ datos: r })} />
        </View>;
      })}
      <Text style={styles.label}>Historial de aplicaciones</Text>
      {!aplicados.length && <Text style={styles.text}>Aún no hay aplicaciones registradas.</Text>}
      {aplicados.map((r) => <View key={r.id} style={styles.card}>
        <Badge label="Aplicado" tone="success" />
        <Text style={styles.label}>{r.nombre}</Text>
        <Text style={styles.text}>{tipoLabel(r)} · Aplicación: {r.fecha_aplicacion}</Text>
        <Text style={styles.text}>Próxima fecha indicada: {r.proxima_fecha ?? 'Sin registrar'}</Text>
        {r.comprobante ? <Pressable accessibilityRole="button" accessibilityLabel={`Ampliar comprobante de ${r.nombre}`} onPress={() => setFoto(r.comprobante)}>
          <Image source={{ uri: r.comprobante }} style={styles.preview} resizeMode="contain" />
          <Text style={styles.link}>Ver comprobante</Text>
        </Pressable> : <Text style={styles.text}>Sin comprobante adjunto</Text>}
        <Boton label="Editar registro" onPress={() => setEditor({ datos: r })} />
      </View>)}
    </>}
    <Modal visible={foto !== null} animationType="fade" onRequestClose={() => setFoto(null)}>
      <SafeAreaView style={styles.modal}>
        <Boton label="Cerrar comprobante" onPress={() => setFoto(null)} />
        {!!foto && <Image source={{ uri: foto }} style={styles.fullImage} resizeMode="contain" accessibilityLabel="Foto del comprobante" />}
      </SafeAreaView>
    </Modal>
  </View>;
}

function Formulario({ mascotaId, edicion, cerrar }: { mascotaId: Identificador; edicion: Edicion; cerrar: (guardado: boolean) => void }) {
  const AppColors = useAppColors();
  const styles = createStyles(AppColors);

  const { guardarCarnet } = useAuth();
  const datos = edicion.datos;
  const [tipo, setTipo] = useState<RegistroCarnet['tipo']>(datos?.tipo ?? edicion.anterior?.tipo ?? 'vacuna');
  const [nombre, setNombre] = useState(datos?.nombre ?? edicion.anterior?.nombre ?? '');
  const [aplicado, setAplicado] = useState(edicion.aplicar || !!datos?.fecha_aplicacion || !datos);
  const [fecha, setFecha] = useState(datos?.fecha_aplicacion ?? fechaPesoHoy());
  const [proxima, setProxima] = useState(edicion.aplicar ? '' : datos?.proxima_fecha ?? '');
  const [foto, setFoto] = useState<string | null>(datos?.comprobante ?? null);
  const [error, setError] = useState('');
  const [seleccionando, setSeleccionando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const bloqueo = useRef(false);
  const [inicial] = useState(() => JSON.stringify({ tipo, nombre, aplicado, fecha, proxima, foto }));
  const { descartar } = useFormularioSalud(JSON.stringify({ tipo, nombre, aplicado, fecha, proxima, foto }) !== inicial, seleccionando || guardando);
  const guardar = async () => {
    if (bloqueo.current || seleccionando) return;
    bloqueo.current = true; setGuardando(true); setError('');
    try {
      await guardarCarnet(mascotaId, { tipo, nombre, fecha_aplicacion: aplicado ? fecha.trim() : null,
        proxima_fecha: proxima.trim() || null, comprobante: foto,
        anterior_id: datos?.anterior_id ?? edicion.anterior?.id }, datos?.id);
      cerrar(true);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar.'); }
    finally { bloqueo.current = false; setGuardando(false); }
  };
  return <View style={styles.card}>
    <Text style={styles.label}>{datos ? 'Actualizar registro' : 'Nuevo registro'}</Text>
    <View style={styles.options}>
      <Opcion disabled={guardando} label="Vacuna" activo={tipo === 'vacuna'} onPress={() => setTipo('vacuna')} />
      <Opcion disabled={guardando} label="Desparasitación" activo={tipo === 'desparasitacion'} onPress={() => setTipo('desparasitacion')} />
    </View>
    <Text style={styles.label}>Nombre de la vacuna o desparasitante</Text>
    <FormInput editable={!guardando} accessibilityLabel="Nombre de vacuna o desparasitante" value={nombre} onChangeText={setNombre} maxLength={120} placeholder="Nombre registrado por el veterinario" />
    {!edicion.aplicar && <View style={styles.options}>
      <Opcion disabled={guardando} label="Ya aplicado" activo={aplicado} onPress={() => setAplicado(true)} />
      <Opcion disabled={guardando} label="Solo próxima fecha" activo={!aplicado} onPress={() => setAplicado(false)} />
    </View>}
    {aplicado && <>
      <Text style={styles.label}>Fecha de aplicación</Text>
      <FormInput editable={!guardando} dateMode="date" accessibilityLabel="Fecha de aplicación" value={fecha} onChangeText={setFecha} maxLength={10} placeholder="DD/MM/AAAA" />
    </>}
    <Text style={styles.label}>Próxima fecha indicada por el veterinario {aplicado ? '(opcional)' : ''}</Text>
    <FormInput editable={!guardando} dateMode="date" accessibilityLabel="Próxima fecha indicada por el veterinario" value={proxima} onChangeText={setProxima} maxLength={10} placeholder="DD/MM/AAAA" />
    <Text style={styles.text}>La próxima fecha se marca vencida a partir del día siguiente. Puedes registrar fechas anteriores para completar el historial.</Text>
    <PhotoField label="Foto del comprobante" comprobante value={foto} onChange={setFoto} disabled={guardando} onBusyChange={setSeleccionando} />
    <Text style={styles.text}>Los datos se guardan en tu cuenta al conectarte; la foto se conserva solo durante esta sesión.</Text>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <Boton label={guardando ? 'Guardando…' : 'Guardar registro'} onPress={guardar} disabled={seleccionando || guardando} />
    <Boton label="Cancelar" onPress={() => descartar(() => cerrar(false))} disabled={seleccionando || guardando} />
  </View>;
}

function Boton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  const AppColors = useAppColors();
  const styles = createStyles(AppColors);

  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.button, disabled && { opacity: 0.5 }]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
}
function Opcion({ label, activo, onPress, disabled = false }: { label: string; activo: boolean; onPress: () => void; disabled?: boolean }) {
  const AppColors = useAppColors();
  const styles = createStyles(AppColors);

  return <Pressable disabled={disabled} accessibilityRole="radio" accessibilityState={{ checked: activo, disabled }} onPress={onPress} style={[styles.option, activo && styles.active]}><Text style={styles.text}>{label}</Text></Pressable>;
}
const createStyles = (AppColors: AppPalette) => (StyleSheet.create({
  section: { gap: 14 }, title: { fontSize: 18, fontWeight: '700', color: AppColors.text },
  label: { fontSize: 15, fontWeight: '600', color: AppColors.text }, text: { fontSize: 14, lineHeight: 21, color: AppColors.textSecondary },
  card: { gap: 12, padding: 14, borderWidth: 1, borderColor: AppColors.textMuted, borderRadius: 14 },
  button: { padding: 12, borderRadius: 12, backgroundColor: AppColors.primaryDark, alignItems: 'center' }, buttonText: { color: AppColors.onPrimary, fontWeight: '700' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, option: { padding: 12, borderWidth: 1, borderColor: AppColors.textMuted, borderRadius: 12 }, active: { backgroundColor: AppColors.infoSoft, borderColor: AppColors.primaryDark },
  preview: { width: '100%', height: 180 }, link: { color: AppColors.accent, paddingVertical: 12, fontWeight: '600' },
  error: { color: AppColors.danger }, modal: { flex: 1, padding: 16, backgroundColor: AppColors.surface }, fullImage: { flex: 1, width: '100%' },
}));
