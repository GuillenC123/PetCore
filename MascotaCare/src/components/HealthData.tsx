import { useAppColors } from '@/context/AppearanceContext';
import type { AppPalette } from '@/constants/theme';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Mascota } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useAviso } from '@/context/AvisosContext';
import { useFormularioSalud } from '@/context/HealthEditContext';
import { edadMascota } from '@/utils/salud';
import PhotoField from './PhotoField';
import PetDataFields, { datosIniciales, prepararDatos, SEXOS } from './PetDataFields';

export default function HealthData({ mascota }: { mascota: Mascota }) {
  const AppColors = useAppColors();
  const styles = createStyles(AppColors);

  const { actualizarFotoMascota, modoDemo } = useAuth();
  const aviso = useAviso();
  const [editando, setEditando] = useState(false);
  const [fotoOcupada, setFotoOcupada] = useState(false);
  useFormularioSalud(false, fotoOcupada);
  return <View style={styles.section}>
    <PhotoField label="Foto de la mascota" value={mascota.imagen} disabled={editando} onBusyChange={setFotoOcupada} onChange={async (foto) => {
      await actualizarFotoMascota(mascota.id, foto);
      aviso(modoDemo ? 'Foto actualizada para esta sesión.' : 'Foto de la mascota actualizada.');
    }} />
    {editando ? <Editor mascota={mascota} cerrar={() => setEditando(false)} /> : <>
      <Dato label="Tipo de animal" valor={mascota.especie} />
      <Dato label="Raza" valor={mascota.raza} />
      <Dato label={mascota.nacimiento ? 'Nacimiento' : 'Edad aproximada'} valor={mascota.nacimiento ?? mascota.edad} />
      {!!mascota.nacimiento && <Dato label="Edad" valor={edadMascota(mascota)} />}
      <Dato label="Sexo" valor={SEXOS[mascota.sexo ?? 'desconocido']} />
      <Dato label="Peso" valor={mascota.peso != null ? `${mascota.peso.toLocaleString('es-PE')} kg` : undefined} />
      <Dato label="Alergias" valor={mascota.alergias} />
      <Dato label="Condiciones registradas" valor={mascota.condiciones} />
      <Boton label="Editar datos de salud" onPress={() => setEditando(true)} disabled={fotoOcupada} />
    </>}
  </View>;
}

function Editor({ mascota, cerrar }: { mascota: Mascota; cerrar: () => void }) {
  const AppColors = useAppColors();
  const styles = createStyles(AppColors);

  const { actualizarFichaSalud, modoDemo } = useAuth();
  const aviso = useAviso();
  const [datos, setDatos] = useState(() => datosIniciales(mascota));
  const [iniciales] = useState(() => JSON.stringify(datos));
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const bloqueo = useRef(false);
  const { descartar } = useFormularioSalud(JSON.stringify(datos) !== iniciales, guardando);
  const guardar = async () => {
    if (bloqueo.current) return;
    bloqueo.current = true; setGuardando(true); setError('');
    try {
      await actualizarFichaSalud(mascota.id, prepararDatos(datos));
      aviso(modoDemo ? 'Ficha guardada para esta sesión.' : 'Ficha de salud guardada.'); cerrar();
    } catch (causa) { setError(causa instanceof Error ? causa.message : 'No se pudo guardar la ficha.'); }
    finally { bloqueo.current = false; setGuardando(false); }
  };
  return <View style={styles.section}>
    <PetDataFields value={datos} onChange={setDatos} disabled={guardando} />
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <Boton label={guardando ? 'Guardando…' : 'Guardar cambios'} onPress={guardar} disabled={guardando} />
    <Boton label="Cancelar" secondary onPress={() => descartar(cerrar)} disabled={guardando} />
  </View>;
}
function Dato({ label, valor }: { label: string; valor?: string }) {
  const AppColors = useAppColors();
  const styles = createStyles(AppColors);

  return <View style={styles.data}><Text style={styles.label}>{label}</Text><Text style={styles.text}>{valor?.trim() || 'Sin registrar'}</Text></View>;
}
function Boton({ label, onPress, disabled = false, secondary = false }: { label: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  const AppColors = useAppColors();
  const styles = createStyles(AppColors);

  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={[styles.button, secondary && styles.secondary, disabled && styles.disabled]}><Text style={[styles.buttonText, secondary && styles.secondaryText]}>{label}</Text></Pressable>;
}
const createStyles = (AppColors: AppPalette) => (StyleSheet.create({
  section: { gap: 16 }, data: { gap: 5, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: AppColors.border },
  label: { fontSize: 14, color: AppColors.text, fontWeight: '700' }, text: { fontSize: 15, lineHeight: 22, color: AppColors.textSecondary },
  button: { minHeight: 48, padding: 14, borderRadius: 12, backgroundColor: AppColors.primaryDark, alignItems: 'center', borderWidth: 1, borderColor: AppColors.primaryDark },
  buttonText: { color: AppColors.onPrimary, fontWeight: '700', fontSize: 15 }, secondary: { backgroundColor: AppColors.surface, borderColor: AppColors.border }, secondaryText: { color: AppColors.accent },
  disabled: { opacity: 0.45 }, error: { color: AppColors.danger, fontSize: 14 },
}));
