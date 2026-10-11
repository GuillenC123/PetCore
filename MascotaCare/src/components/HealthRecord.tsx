import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Mascota } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { AppColors } from '@/constants/theme';
import { edadMascota } from '@/utils/salud';
import PetHealthStatus from './PetHealthStatus';
import PetImage from './PetImage';
import PetDataFields, { datosIniciales, prepararDatos, SEXOS } from './PetDataFields';
import { useAviso } from '@/context/AvisosContext';
import Treatments from './Treatments';
import WeightTracker from './WeightTracker';
import VaccineRecord from './VaccineRecord';
import HealthTimeline from './HealthTimeline';
import HealthSection from './HealthSection';
import { AdaptiveColumns, layoutStyles } from './AdaptiveLayout';



export default function HealthRecord({ mascota }: { mascota: Mascota }) {
  const [editando, setEditando] = useState(false);

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
        <AdaptiveColumns>
        <View style={layoutStyles.column}>
        <HealthSection key="datos" title="Datos de salud" description="Edad, sexo, tipo de animal, peso y datos opcionales" icon="medical-outline" open={seccion === 'datos'} onToggle={() => alternar('datos')}>
        {editando ? <Editor mascota={mascota} cancelar={() => setEditando(false)} guardar={() => setEditando(false)} /> : <>
        <Dato label="Tipo de animal" valor={mascota.especie} />
        <Dato label={mascota.nacimiento ? 'Nacimiento' : 'Edad aproximada'} valor={mascota.nacimiento ?? mascota.edad} />
        {!!mascota.nacimiento && <Dato label="Edad" valor={edadMascota(mascota)} />}
        <Dato label="Sexo" valor={SEXOS[mascota.sexo ?? 'desconocido']} />
        <Dato label="Peso" valor={mascota.peso != null ? `${mascota.peso.toLocaleString('es-PE')} kg` : ''} />
        <Dato label="Alergias" valor={mascota.alergias} />
        <Dato label="Condiciones registradas" valor={mascota.condiciones} />
        <Boton label="Editar ficha de salud" onPress={() => { setEditando(true); }} />
        </>}
        </HealthSection>
        </View>
        <View style={layoutStyles.column}>
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
        </View>
        </AdaptiveColumns>
      </>
    </View>
  );
}

function Editor({ mascota, cancelar, guardar }: { mascota: Mascota; cancelar: () => void; guardar: () => void }) {
  const { actualizarFichaSalud, modoDemo } = useAuth();
  const mostrarAviso = useAviso();
  const [datos, setDatos] = useState(() => datosIniciales(mascota));
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const bloqueo = useRef(false);
  const enviar = async () => {
    if (bloqueo.current) return;
    bloqueo.current = true; setGuardando(true); setError('');
    try {
      await actualizarFichaSalud(mascota.id, prepararDatos(datos));
      mostrarAviso(modoDemo ? 'Ficha guardada para esta sesión.' : 'Ficha de salud guardada.');
      guardar();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar la ficha.'); }
    finally { bloqueo.current = false; setGuardando(false); }
  };
  return <View style={styles.form}>
    <PetDataFields value={datos} onChange={setDatos} disabled={guardando} />
    {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
    <Boton label={guardando ? 'Guardando…' : 'Guardar ficha'} onPress={enviar} disabled={guardando} />
    <Boton label="Cancelar" onPress={cancelar} disabled={guardando} />
  </View>;
}

function Dato({ label, valor }: { label: string; valor?: string }) {
  return <View style={styles.data}><Text style={styles.label}>{label}</Text><Text style={styles.text}>{valor?.trim() || 'Sin registrar'}</Text></View>;
}
function Boton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }} onPress={onPress} style={styles.button}><Text style={styles.buttonText}>{label}</Text></Pressable>;
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
  button: { padding: 14, borderRadius: 12, backgroundColor: '#0369A1', alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  error: { color: '#B91C1C', fontSize: 14 },
});
