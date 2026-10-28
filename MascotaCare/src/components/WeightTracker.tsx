import { useAppColors } from '@/context/AppearanceContext';
import type { AppPalette } from '@/constants/theme';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Mascota } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { fechaPesoHoy, puntosPeso } from '@/utils/peso';
import { validarPeso } from '@/utils/validaciones';
import FormInput from './FormInput';
import { useAviso } from '@/context/AvisosContext';
import { useFormularioSalud } from '@/context/HealthEditContext';

const fechaVisible = (fecha: string) => fecha.split('-').reverse().join('/');

export default function WeightTracker({ mascota }: { mascota: Mascota }) {
  const AppColors = useAppColors();
  const styles = createStyles(AppColors);

  const { registrarPeso, modoDemo } = useAuth();
  const mostrarAviso = useAviso();
  const bloqueo = useRef(false);
  const [guardando, setGuardando] = useState(false);
  const [peso, setPeso] = useState('');
  const [fecha, setFecha] = useState(fechaPesoHoy);
  const [inicial, setInicial] = useState(() => ({ peso: '', fecha }));
  const sucio = peso !== inicial.peso || fecha !== inicial.fecha;
  const { descartar } = useFormularioSalud(sucio, guardando);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [ancho, setAncho] = useState(240);
  const [limite, setLimite] = useState(10);
  const registros = [...(mascota.registros_peso ?? [])].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const puntos = puntosPeso(registros, Math.max(1, ancho - 24), 130);
  const guardar = async () => {
    if (bloqueo.current) return;
    setMensaje('');
    const validacion = validarPeso(peso);
    if (!peso.trim() || validacion) { setError(validacion ?? 'Ingresa el peso en kg.'); return; }
    bloqueo.current = true; setGuardando(true);
    try {
      await registrarPeso(mascota.id, Number(peso.trim().replace(',', '.')), fecha);
      setError(''); setPeso(''); setInicial({ peso: '', fecha }); mostrarAviso(modoDemo ? 'Peso guardado para esta sesión.' : 'Peso guardado.');
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar.'); }
    finally { bloqueo.current = false; setGuardando(false); }
  };
  return <View style={styles.section}>
    <Text style={styles.title}>Seguimiento de peso</Text>
    <Text style={styles.label}>Peso en kg</Text>
    <FormInput editable={!guardando} accessibilityLabel="Nuevo peso en kilogramos" keyboardType="decimal-pad" placeholder="Ej. 4,5" value={peso} onChangeText={setPeso} />
    <Text style={styles.label}>Fecha de medición</Text>
    <FormInput editable={!guardando} dateMode="date" accessibilityLabel="Fecha de medición del peso" placeholder="DD/MM/AAAA" maxLength={10} value={fecha} onChangeText={setFecha} />
    <Text style={styles.text}>Un registro por día. Guardar una fecha existente reemplaza su peso.</Text>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {!!mensaje && <Text accessibilityRole="alert" style={styles.text}>{mensaje}</Text>}
    <Pressable disabled={guardando} accessibilityState={{ disabled: guardando, busy: guardando }} accessibilityRole="button" style={styles.button} onPress={guardar}><Text style={styles.buttonText}>{guardando ? 'Guardando…' : 'Guardar peso'}</Text></Pressable>
    {sucio && <Pressable disabled={guardando} accessibilityRole="button" style={styles.cancel} onPress={() => descartar(() => {
      setPeso(inicial.peso); setFecha(inicial.fecha); setError(''); setMensaje('');
    })}><Text style={styles.link}>Cancelar</Text></Pressable>}
    {registros.length ? <>
      <Text style={styles.label}>Evolución del peso (kg)</Text>
      <Text style={styles.text}>Mínimo: {Math.min(...registros.map((r) => r.peso))} kg · Máximo: {Math.max(...registros.map((r) => r.peso))} kg</Text>
      <View onLayout={(event) => setAncho(event.nativeEvent.layout.width)} style={styles.chart}
        accessible accessibilityRole="image" accessibilityLabel={`Gráfica de ${registros.length} mediciones de peso. Valores y fechas disponibles en el historial inferior.`}>
        {[12, 77, 142].map((top) => <View key={top} style={[styles.grid, { top }]} />)}
        {puntos.map((p, i) => {
          const siguiente = puntos[i + 1];
          if (!siguiente) return null;
          const dx = siguiente.x - p.x, dy = siguiente.y - p.y;
          const largo = Math.hypot(dx, dy);
          return <View key={`linea-${i}`} style={[styles.line, { width: largo,
            left: (p.x + siguiente.x) / 2 + 12 - largo / 2,
            top: (p.y + siguiente.y) / 2 + 11,
            transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
          }]} />;
        })}
        {puntos.map((p, i) => <View key={registros[i].fecha} style={[styles.dot, { left: p.x + 8, top: p.y + 8 }]} />)}
      </View>
      <View style={styles.axis}><Text style={styles.text}>{fechaVisible(registros[0].fecha)}</Text><Text style={styles.text}>{fechaVisible(registros[registros.length - 1].fecha)}</Text></View>
      {registros.length === 1 && <Text style={styles.text}>Añade otra medición en una fecha distinta para ver la evolución.</Text>}
      <Text style={styles.label}>Historial · {registros.length} registros</Text>
      {[...registros].reverse().slice(0, limite).map((r) => <View key={r.fecha} style={styles.row}>
        <View><Text style={styles.label}>{r.peso.toLocaleString('es-PE')} kg</Text><Text style={styles.text}>{fechaVisible(r.fecha)}</Text></View>
        <Pressable disabled={guardando} accessibilityRole="button" accessibilityLabel={`Corregir peso del ${fechaVisible(r.fecha)}`} style={styles.edit}
          onPress={() => descartar(() => { setPeso(String(r.peso)); setFecha(fechaVisible(r.fecha)); setError(''); setMensaje('Fecha y peso cargados en el formulario superior.'); })}><Text style={styles.link}>Corregir</Text></Pressable>
      </View>)}
      {registros.length > limite && <Pressable accessibilityRole="button" style={styles.edit} onPress={() => setLimite(limite + 10)}><Text style={styles.link}>Ver más registros</Text></Pressable>}
    </> : <Text style={styles.text}>{mascota.peso != null ? `Peso actual: ${mascota.peso} kg, sin fecha registrada. Añade su fecha de medición para incluirlo en la gráfica.` : 'Aún no hay mediciones. Registra el primer peso para comenzar.'}</Text>}
  </View>;
}

const createStyles = (AppColors: AppPalette) => (StyleSheet.create({
  section: { gap: 12 },
  title: { fontSize: 18, fontWeight: '700', color: AppColors.text },
  label: { fontSize: 15, fontWeight: '600', color: AppColors.text },
  text: { fontSize: 14, lineHeight: 21, color: AppColors.textSecondary },
  error: { color: AppColors.danger },
  button: { padding: 14, backgroundColor: AppColors.primaryDark, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: AppColors.onPrimary, fontWeight: '700' },
  chart: { height: 154, position: 'relative', backgroundColor: AppColors.infoSoft, borderRadius: 8 },
  grid: { position: 'absolute', left: 12, right: 12, height: 1, backgroundColor: AppColors.border },
  line: { position: 'absolute', height: 2, backgroundColor: AppColors.primaryDark },
  dot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: AppColors.primaryDark },
  axis: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: AppColors.border },
  edit: { padding: 12 },
  cancel: { minHeight: 46, padding: 12, borderWidth: 1, borderColor: AppColors.border, borderRadius: 12, alignItems: 'center' },
  link: { color: AppColors.accent, fontWeight: '600' },
}));
