import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Mascota } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { AppColors } from '@/constants/theme';
import { edadMascota } from '@/utils/salud';
import PetHealthStatus from './PetHealthStatus';
import PetImage from './PetImage';
import FormInput from './FormInput';
import Treatments from './Treatments';
import WeightTracker from './WeightTracker';
import VaccineRecord from './VaccineRecord';
import HealthTimeline from './HealthTimeline';
import HealthSection from './HealthSection';

const SEXOS = { desconocido: 'Sin registrar', macho: 'Macho', hembra: 'Hembra' } as const;

export default function HealthRecord({ mascota }: { mascota: Mascota }) {
  const [editando, setEditando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [seccion, setSeccion] = useState<string | null>(null);
  const alternar = (nombre: string) => setSeccion((actual) => actual === nombre ? null : nombre);
  return (
    <View style={styles.card}>
      <View style={styles.identity}>
        <PetImage url={mascota.imagen} nombre={mascota.nombre} size={64} />
        <View style={styles.identityText}>
          <Text style={styles.title}>{mascota.nombre}</Text>
          <Text style={styles.text}>{mascota.especie} · {mascota.raza}</Text>
          <PetHealthStatus mascota={mascota} />
        </View>
      </View>
      <>
        <Text style={styles.text}>{edadMascota(mascota)} · {mascota.peso != null ? `${mascota.peso} kg` : 'Peso sin registrar'}</Text>
        <HealthSection title="Datos de salud" description="Nacimiento, sexo, alergias y condiciones" icon="medical-outline" open={seccion === 'datos'} onToggle={() => alternar('datos')}>
        {editando ? <Editor mascota={mascota} cancelar={() => setEditando(false)} guardar={() => { setEditando(false); setGuardado(true); }} /> : <>
        <Dato label={mascota.nacimiento ? 'Nacimiento' : 'Edad aproximada'} valor={mascota.nacimiento ?? mascota.edad} />
        {!!mascota.nacimiento && <Dato label="Edad" valor={edadMascota(mascota)} />}
        <Dato label="Sexo" valor={SEXOS[mascota.sexo ?? 'desconocido']} />
        <Dato label="Peso" valor={mascota.peso != null ? `${mascota.peso.toLocaleString('es-PE')} kg` : ''} />
        <Dato label="Alergias" valor={mascota.alergias} />
        <Dato label="Condiciones registradas" valor={mascota.condiciones} />
        {guardado && <Text accessibilityRole="alert" style={styles.text}>Ficha guardada para esta sesión.</Text>}
        <Boton label="Editar ficha de salud" onPress={() => { setEditando(true); setGuardado(false); }} />
        </>}
        </HealthSection>
        <HealthSection title="Peso" description="Registrar una medición y ver su evolución" icon="scale-outline" open={seccion === 'peso'} onToggle={() => alternar('peso')}>
        <WeightTracker mascota={mascota} />
        </HealthSection>
        <HealthSection title="Vacunas y desparasitación" description="Carnet, próximas aplicaciones y comprobantes" icon="shield-checkmark-outline" open={seccion === 'vacunas'} onToggle={() => alternar('vacunas')}>
        <VaccineRecord mascota={mascota} />
        </HealthSection>
        <HealthSection title="Tratamientos" description="Medicamentos, horarios y registro de tomas" icon="medkit-outline" open={seccion === 'tratamientos'} onToggle={() => alternar('tratamientos')}>
        <Treatments mascotaId={mascota.id} nombre={mascota.nombre} />
        </HealthSection>
        <HealthSection title="Historial de salud" description="Consultas, observaciones y documentos" icon="time-outline" open={seccion === 'historial'} onToggle={() => alternar('historial')}>
        <HealthTimeline mascota={mascota} />
        </HealthSection>
      </>
    </View>
  );
}

function Editor({ mascota, cancelar, guardar }: { mascota: Mascota; cancelar: () => void; guardar: () => void }) {
  const { actualizarFichaSalud } = useAuth();
  const [usaNacimiento, setUsaNacimiento] = useState(!!mascota.nacimiento);
  const [nacimiento, setNacimiento] = useState(mascota.nacimiento ?? '');
  const [edad, setEdad] = useState(edadMascota(mascota));
  const [sexo, setSexo] = useState(mascota.sexo ?? 'desconocido');
  const [alergias, setAlergias] = useState(mascota.alergias ?? '');
  const [condiciones, setCondiciones] = useState(mascota.condiciones ?? '');
  const [error, setError] = useState('');
  const enviar = () => {
    try {
      actualizarFichaSalud(mascota.id, { nacimiento: usaNacimiento ? nacimiento.trim() : null, edad,
        sexo, peso: mascota.peso ?? null, alergias, condiciones });
      guardar();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar la ficha.'); }
  };
  return <View style={styles.form}>
    <Text style={styles.label}>Nacimiento o edad aproximada</Text>
    <View style={styles.options}>
      <Opcion label="Conozco el nacimiento" activo={usaNacimiento} onPress={() => setUsaNacimiento(true)} />
      <Opcion label="Edad aproximada" activo={!usaNacimiento} onPress={() => setUsaNacimiento(false)} />
    </View>
    {usaNacimiento ? <FormInput dateMode="date" accessibilityLabel="Fecha de nacimiento" placeholder="DD/MM/AAAA" maxLength={10} value={nacimiento} onChangeText={setNacimiento} />
      : <FormInput accessibilityLabel="Edad aproximada" placeholder="Ej. 2 años y 3 meses" maxLength={60} value={edad} onChangeText={setEdad} />}
    <Text style={styles.label}>Sexo</Text>
    <View style={styles.options}>{(Object.entries(SEXOS) as [keyof typeof SEXOS, string][]).map(([value, label]) =>
      <Opcion key={value} label={label} activo={sexo === value} onPress={() => setSexo(value)} />)}</View>
    <Text style={styles.label}>Peso en kg (opcional)</Text>
    <Text style={styles.text}>{mascota.peso != null ? `${mascota.peso} kg` : 'Sin registrar'}. Actualízalo en Seguimiento de peso, indicando la fecha de medición.</Text>
    <Text style={styles.label}>Alergias</Text>
    <FormInput accessibilityLabel="Alergias" placeholder="Escribe las alergias conocidas" multiline maxLength={1000} value={alergias} onChangeText={setAlergias} />
    <Text style={styles.label}>Condiciones registradas</Text>
    <FormInput accessibilityLabel="Condiciones registradas" placeholder="Anota las condiciones registradas por su veterinario" multiline maxLength={1000} value={condiciones} onChangeText={setCondiciones} />
    <Text style={styles.text}>Los campos vacíos se mostrarán como “Sin registrar”. Los cambios se conservan durante esta sesión.</Text>
    {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
    <Boton label="Guardar ficha" onPress={enviar} />
    <Boton label="Cancelar" onPress={cancelar} />
  </View>;
}

function Dato({ label, valor }: { label: string; valor?: string }) {
  return <View style={styles.data}><Text style={styles.label}>{label}</Text><Text style={styles.text}>{valor?.trim() || 'Sin registrar'}</Text></View>;
}
function Opcion({ label, activo, onPress }: { label: string; activo: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: activo }} onPress={onPress} style={[styles.option, activo && styles.active]}><Text style={styles.text}>{label}</Text></Pressable>;
}
function Boton({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.button}><Text style={styles.buttonText}>{label}</Text></Pressable>;
}
const styles = StyleSheet.create({
  card: { padding: 18, borderRadius: 18, backgroundColor: AppColors.surface, gap: 16 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  identityText: { flex: 1, gap: 6 },
  title: { fontSize: 22, fontWeight: '800', color: AppColors.text },
  text: { fontSize: 15, lineHeight: 22, color: AppColors.textSecondary },
  label: { fontSize: 15, fontWeight: '700', color: AppColors.text },
  data: { gap: 5, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#EEF0F3' },
  form: { gap: 12 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#D1D5DB' },
  active: { backgroundColor: AppColors.infoSoft, borderColor: '#0369A1' },
  button: { padding: 14, borderRadius: 12, backgroundColor: '#0369A1', alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  error: { color: '#B91C1C', fontSize: 14 },
});
