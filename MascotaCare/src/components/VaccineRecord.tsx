import { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import type { Mascota, RegistroCarnet } from '@/types';
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
    {editor ? <Formulario mascotaId={mascota.id} edicion={editor} cerrar={(guardado) => { setEditor(null); setMensaje(guardado ? 'Carnet guardado para esta sesión.' : ''); }} /> : <>
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

function Formulario({ mascotaId, edicion, cerrar }: { mascotaId: number; edicion: Edicion; cerrar: (guardado: boolean) => void }) {
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
  const elegirFoto = async () => {
    setError(''); setSeleccionando(true);
    try {
      const resultado = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1 });
      if (!resultado.canceled && resultado.assets[0]) setFoto(resultado.assets[0].uri);
    } catch { setError('No se pudo abrir la foto. Revisa el acceso a tus fotos e inténtalo de nuevo.'); }
    finally { setSeleccionando(false); }
  };
  const guardar = () => {
    try {
      guardarCarnet(mascotaId, { tipo, nombre, fecha_aplicacion: aplicado ? fecha.trim() : null,
        proxima_fecha: proxima.trim() || null, comprobante: foto,
        anterior_id: datos?.anterior_id ?? edicion.anterior?.id }, datos?.id);
      cerrar(true);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar.'); }
  };
  return <View style={styles.card}>
    <Text style={styles.label}>{datos ? 'Actualizar registro' : 'Nuevo registro'}</Text>
    <View style={styles.options}>
      <Opcion label="Vacuna" activo={tipo === 'vacuna'} onPress={() => setTipo('vacuna')} />
      <Opcion label="Desparasitación" activo={tipo === 'desparasitacion'} onPress={() => setTipo('desparasitacion')} />
    </View>
    <Text style={styles.label}>Nombre de la vacuna o desparasitante</Text>
    <FormInput accessibilityLabel="Nombre de vacuna o desparasitante" value={nombre} onChangeText={setNombre} maxLength={120} placeholder="Nombre registrado por el veterinario" />
    {!edicion.aplicar && <View style={styles.options}>
      <Opcion label="Ya aplicado" activo={aplicado} onPress={() => setAplicado(true)} />
      <Opcion label="Solo próxima fecha" activo={!aplicado} onPress={() => setAplicado(false)} />
    </View>}
    {aplicado && <>
      <Text style={styles.label}>Fecha de aplicación</Text>
      <FormInput accessibilityLabel="Fecha de aplicación" value={fecha} onChangeText={setFecha} maxLength={10} placeholder="DD/MM/AAAA" />
    </>}
    <Text style={styles.label}>Próxima fecha indicada por el veterinario {aplicado ? '(opcional)' : ''}</Text>
    <FormInput accessibilityLabel="Próxima fecha indicada por el veterinario" value={proxima} onChangeText={setProxima} maxLength={10} placeholder="DD/MM/AAAA" />
    <Text style={styles.text}>La próxima fecha se marca vencida a partir del día siguiente. Puedes registrar fechas anteriores para completar el historial.</Text>
    <Boton label={seleccionando ? 'Abriendo fotos…' : foto ? 'Cambiar foto del comprobante' : 'Adjuntar foto del comprobante'} onPress={elegirFoto} disabled={seleccionando} />
    {!!foto && <>
      <Image source={{ uri: foto }} style={styles.preview} resizeMode="contain" accessibilityLabel="Comprobante seleccionado" />
      <Boton label="Quitar foto" onPress={() => setFoto(null)} disabled={seleccionando} />
    </>}
    <Text style={styles.text}>Los datos y la foto se conservan durante esta sesión.</Text>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <Boton label="Guardar registro" onPress={guardar} disabled={seleccionando} />
    <Boton label="Cancelar" onPress={() => cerrar(false)} disabled={seleccionando} />
  </View>;
}

function Boton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.button, disabled && { opacity: 0.5 }]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
}
function Opcion({ label, activo, onPress }: { label: string; activo: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: activo }} onPress={onPress} style={[styles.option, activo && styles.active]}><Text style={styles.text}>{label}</Text></Pressable>;
}
const styles = StyleSheet.create({
  section: { gap: 14 }, title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  label: { fontSize: 15, fontWeight: '600', color: '#111827' }, text: { fontSize: 14, lineHeight: 21, color: '#6B7280' },
  card: { gap: 12, padding: 14, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 14 },
  button: { padding: 12, borderRadius: 12, backgroundColor: '#0369A1', alignItems: 'center' }, buttonText: { color: '#FFFFFF', fontWeight: '700' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, option: { padding: 12, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12 }, active: { backgroundColor: '#E0F2FE', borderColor: '#0369A1' },
  preview: { width: '100%', height: 180 }, link: { color: '#0369A1', paddingVertical: 12, fontWeight: '600' },
  error: { color: '#B91C1C' }, modal: { flex: 1, padding: 16, backgroundColor: '#FFFFFF' }, fullImage: { flex: 1, width: '100%' },
});
