import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Mascota } from '@/types';
import { AppColors } from '@/constants/theme';
import { edadMascota, validarFichaSalud, type DatosFichaSalud } from '@/utils/salud';
import { validarPeso } from '@/utils/validaciones';
import FormInput from './FormInput';

export const SEXOS = { desconocido: 'Sin registrar', macho: 'Macho', hembra: 'Hembra' } as const;
export interface PetDataDraft {
  especie: string; edad: string; nacimiento: string; usaNacimiento: boolean;
  sexo: NonNullable<Mascota['sexo']>; peso: string; alergias: string; condiciones: string;
}
export function datosIniciales(mascota?: Mascota): PetDataDraft {
  return { especie: mascota?.especie ?? 'Perro', edad: mascota ? edadMascota(mascota) : '',
    nacimiento: mascota?.nacimiento ?? '', usaNacimiento: !!mascota?.nacimiento,
    sexo: mascota?.sexo ?? 'desconocido', peso: mascota?.peso != null ? String(mascota.peso) : '',
    alergias: mascota?.alergias ?? '', condiciones: mascota?.condiciones ?? '' };
}
export function prepararDatos(datos: PetDataDraft): DatosFichaSalud & { especie: string } {
  const errorPeso = validarPeso(datos.peso);
  if (errorPeso) throw new Error(errorPeso);
  const nacimiento = datos.usaNacimiento ? datos.nacimiento.trim() : null;
  const ficha = { especie: datos.especie, nacimiento,
    edad: nacimiento ? edadMascota({ nacimiento, edad: datos.edad }) : datos.edad.trim(),
    sexo: datos.sexo, peso: datos.peso.trim() ? Number(datos.peso.trim().replace(',', '.')) : null,
    alergias: datos.alergias.trim(), condiciones: datos.condiciones.trim() };
  const error = validarFichaSalud(ficha);
  if (error) throw new Error(error);
  return ficha;
}

/** Los mismos campos se usan al crear la mascota y al editar su ficha. */
export default function PetDataFields({ value, onChange, disabled = false }: {
  value: PetDataDraft; onChange: (value: PetDataDraft) => void; disabled?: boolean;
}) {
  const cambiar = <K extends keyof PetDataDraft>(campo: K, valor: PetDataDraft[K]) => onChange({ ...value, [campo]: valor });
  const opcion = (label: string, activo: boolean, onPress: () => void) => (
    <Pressable key={label} disabled={disabled} accessibilityRole="radio" accessibilityState={{ checked: activo, disabled }}
      onPress={onPress} style={[styles.option, activo && styles.active]}><Text style={styles.text}>{label}</Text></Pressable>
  );
  return <View style={styles.form}>
    <Text style={styles.label}>Tipo de animal</Text>
    <View style={styles.options}>{['Perro', 'Gato', 'Otro'].map((especie) => opcion(especie, value.especie === especie, () => cambiar('especie', especie)))}</View>
    <Text style={styles.label}>Edad</Text>
    <View style={styles.options}>
      {opcion('Edad aproximada', !value.usaNacimiento, () => cambiar('usaNacimiento', false))}
      {opcion('Fecha de nacimiento', value.usaNacimiento, () => cambiar('usaNacimiento', true))}
    </View>
    {value.usaNacimiento
      ? <FormInput editable={!disabled} dateMode="date" label="Nacimiento" placeholder="DD/MM/AAAA" maxLength={10} value={value.nacimiento} onChangeText={(v) => cambiar('nacimiento', v)} />
      : <FormInput editable={!disabled} label="Edad aproximada" placeholder="Ej. 2 años y 3 meses" maxLength={60} value={value.edad} onChangeText={(v) => cambiar('edad', v)} />}
    <Text style={styles.label}>Sexo</Text>
    <View style={styles.options}>{(Object.entries(SEXOS) as [keyof typeof SEXOS, string][]).map(([sexo, label]) => opcion(label, value.sexo === sexo, () => cambiar('sexo', sexo)))}</View>
    <FormInput editable={!disabled} label="Peso en kg (opcional)" accessibilityLabel="Peso de la mascota en kilogramos" keyboardType="decimal-pad" placeholder="Ej. 4,5" value={value.peso} onChangeText={(v) => cambiar('peso', v)} />
    <Text style={styles.text}>Al cambiar el peso se registra una medición con la fecha de hoy. Para otra fecha, usa Seguimiento de peso.</Text>
    <FormInput editable={!disabled} label="Alergias (opcional)" placeholder="Puedes completarlas después" multiline maxLength={1000} value={value.alergias} onChangeText={(v) => cambiar('alergias', v)} />
    <FormInput editable={!disabled} label="Condiciones registradas (opcional)" placeholder="Puedes completarlas después" multiline maxLength={1000} value={value.condiciones} onChangeText={(v) => cambiar('condiciones', v)} />
    <Text style={styles.text}>Puedes añadir o modificar estos datos después en Ficha de salud. Los campos vacíos se muestran como «Sin registrar».</Text>
  </View>;
}
const styles = StyleSheet.create({
  form: { gap: 12 }, label: { fontSize: 15, fontWeight: '700', color: AppColors.text },
  text: { fontSize: 14, lineHeight: 21, color: AppColors.textSecondary },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#D1D5DB' },
  active: { backgroundColor: AppColors.infoSoft, borderColor: AppColors.primaryDark },
});
