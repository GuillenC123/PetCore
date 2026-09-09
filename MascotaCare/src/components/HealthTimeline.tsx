import { useState } from 'react';
import { Image, Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { useAuth } from '@/context/AuthContext';
import { useAhora } from '@/hooks/use-ahora';
import type { AdjuntoSalud, Mascota, ObservacionSalud } from '@/types';
import { crearHistorial } from '@/utils/historial';
import { interpretarFechaVisita } from '@/utils/citas';
import { fechaPesoHoy } from '@/utils/peso';
import FormInput from './FormInput';

export default function HealthTimeline({ mascota }: { mascota: Mascota }) {
  const { citas, tratamientos, adjuntarHistorial } = useAuth();
  const ahora = useAhora();
  const [creando, setCreando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [foto, setFoto] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [limite, setLimite] = useState(15);
  const historial = crearHistorial(mascota, citas, tratamientos, ahora);
  const adjuntar = async (clave: string) => {
    setMensaje(''); setOcupado(true);
    try {
      const resultado = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], multiple: true, copyToCacheDirectory: true });
      if (!resultado.canceled) {
        adjuntarHistorial(mascota.id, clave, resultado.assets.map((a) => ({ uri: a.uri, nombre: a.name, mime: a.mimeType ?? (a.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/*') })));
        setMensaje('Archivos adjuntados para esta sesión.');
      }
    } catch { setMensaje('No se pudieron seleccionar los archivos. Inténtalo de nuevo.'); }
    finally { setOcupado(false); }
  };
  const abrir = async (archivo: AdjuntoSalud) => {
    if (archivo.mime.startsWith('image/')) { setFoto(archivo.uri); return; }
    try {
      if (Platform.OS === 'web') await Linking.openURL(archivo.uri);
      else if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(archivo.uri, { mimeType: archivo.mime, UTI: 'com.adobe.pdf', dialogTitle: archivo.nombre });
      else setMensaje('Este dispositivo no dispone de un visor para abrir el documento.');
    } catch { setMensaje('No se pudo abrir el documento.'); }
  };
  return <View style={styles.section}>
    <Text style={styles.title}>Historial de salud</Text>
    <Text style={styles.text}>Consultas realizadas, aplicaciones, tratamientos y observaciones, del más reciente al más antiguo.</Text>
    {creando ? <Formulario mascotaId={mascota.id} cerrar={(guardado) => { setCreando(false); setMensaje(guardado ? 'Registro guardado. Puedes adjuntar documentos o fotos en su tarjeta.' : ''); }} />
      : <Boton label="Registrar consulta u observación" onPress={() => { setMensaje(''); setCreando(true); }} />}
    {!!mensaje && <Text accessibilityRole="alert" style={styles.text}>{mensaje}</Text>}
    {!historial.length && <Text style={styles.text}>Todavía no hay eventos de salud registrados.</Text>}
    {historial.slice(0, limite).map((e) => <View key={e.clave} style={styles.event}>
      <Text style={styles.date}>● {new Date(e.fecha).toLocaleDateString('es-PE')} · {e.tipo}</Text>
      <Text style={styles.label}>{e.titulo}</Text>
      {!!e.detalle && <Text style={styles.text}>{e.detalle}</Text>}
      {e.adjuntos.map((a, i) => <Pressable key={`${a.uri}-${i}`} accessibilityRole="button" onPress={() => abrir(a)} style={styles.attachment}>
        {a.mime.startsWith('image/') && <Image source={{ uri: a.uri }} style={styles.thumbnail} resizeMode="contain" />}
        <Text style={styles.link}>{a.mime.startsWith('image/') ? 'Ampliar foto' : Platform.OS === 'web' ? 'Abrir documento' : 'Abrir o compartir documento'}: {a.nombre}</Text>
      </Pressable>)}
      <Boton label="Adjuntar PDF o fotografía" disabled={ocupado} onPress={() => adjuntar(e.clave)} />
    </View>)}
    {historial.length > limite && <Boton label="Ver eventos anteriores" onPress={() => setLimite(limite + 15)} />}
    <Text style={styles.text}>Los registros y archivos se conservan durante esta sesión.</Text>
    <Modal visible={foto !== null} onRequestClose={() => setFoto(null)}>
      <SafeAreaView style={styles.modal}>
        <Boton label="Cerrar fotografía" onPress={() => setFoto(null)} />
        {!!foto && <Image source={{ uri: foto }} style={styles.image} resizeMode="contain" accessibilityLabel="Fotografía del historial" />}
      </SafeAreaView>
    </Modal>
  </View>;
}

function Formulario({ mascotaId, cerrar }: { mascotaId: number; cerrar: (guardado: boolean) => void }) {
  const { agregarObservacion } = useAuth();
  const [tipo, setTipo] = useState<ObservacionSalud['tipo']>('observacion');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState(fechaPesoHoy);
  const [error, setError] = useState('');
  const guardar = () => {
    try {
      const dia = interpretarFechaVisita(fecha, '00:00');
      if (!dia) throw new Error('Introduce una fecha válida (DD/MM/AAAA).');
      agregarObservacion(mascotaId, { tipo, titulo, descripcion, fecha: dia.toISOString() }); cerrar(true);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar.'); }
  };
  return <View style={styles.form}>
    <View style={styles.options}>{(['observacion', 'consulta'] as const).map((value) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: tipo === value }}
      style={[styles.option, tipo === value && { backgroundColor: '#E0F2FE' }]} onPress={() => setTipo(value)}><Text>{value === 'consulta' ? 'Consulta realizada' : 'Observación'}</Text></Pressable>)}</View>
    <Text style={styles.label}>Título</Text>
    <FormInput accessibilityLabel="Título del registro de salud" value={titulo} onChangeText={setTitulo} maxLength={120} placeholder="Motivo de consulta u observación" />
    <Text style={styles.label}>Fecha</Text>
    <FormInput accessibilityLabel="Fecha del evento de salud" value={fecha} onChangeText={setFecha} maxLength={10} placeholder="DD/MM/AAAA" />
    <Text style={styles.label}>Descripción</Text>
    <FormInput accessibilityLabel="Descripción del evento de salud" value={descripcion} onChangeText={setDescripcion} maxLength={2000} multiline placeholder="Anota lo observado o las indicaciones de la consulta" />
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <Boton label="Guardar evento" onPress={guardar} /><Boton label="Cancelar" onPress={() => cerrar(false)} />
  </View>;
}
function Boton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.button, disabled && { opacity: 0.5 }]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
}
const styles = StyleSheet.create({
  section: { gap: 14 }, title: { fontSize: 18, fontWeight: '700', color: '#111827' }, label: { fontSize: 15, fontWeight: '600', color: '#111827' },
  text: { fontSize: 14, lineHeight: 21, color: '#6B7280' }, event: { gap: 12, padding: 14, borderLeftWidth: 3, borderLeftColor: '#0369A1', backgroundColor: '#F8FAFC', borderRadius: 10 },
  date: { color: '#0369A1', fontWeight: '600' }, button: { padding: 12, borderRadius: 12, backgroundColor: '#0369A1', alignItems: 'center' }, buttonText: { color: '#FFFFFF', fontWeight: '600' },
  attachment: { gap: 8, paddingVertical: 8 }, thumbnail: { width: '100%', height: 120 }, link: { color: '#0369A1', fontWeight: '600' },
  modal: { flex: 1, padding: 16 }, image: { flex: 1, width: '100%' }, form: { gap: 12 }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { padding: 12, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12 }, error: { color: '#B91C1C' },
});
