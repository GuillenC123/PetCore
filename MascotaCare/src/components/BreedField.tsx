import { useAppColors } from '@/context/AppearanceContext';
import type { AppPalette } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRazas } from '@/hooks/use-razas';
import { filtrarRazas, RAZA_DESCONOCIDA, RAZA_MESTIZA } from '@/utils/razas';
import FormInput from './FormInput';

interface Props {
  especie: string;
  value: string;
  onChange: (raza: string) => void;
  disabled?: boolean;
  error?: string;
}

export default function BreedField({ especie, value, onChange, disabled, error }: Props) {
  const AppColors = useAppColors();
  const styles = createStyles(AppColors);

  const { catalogo, cargando, error: errorCarga, reintentar } = useRazas(especie);
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [manual, setManual] = useState(false);
  const cerrar = () => { setAbierto(false); setBusqueda(''); };
  const elegir = (raza: string) => { onChange(raza); setManual(false); cerrar(); };
  const escribir = () => { setManual(true); onChange(''); cerrar(); };

  if (especie !== 'Perro' && especie !== 'Gato') {
    return <FormInput label="Raza o variedad" placeholder="Ej. Conejo belier" maxLength={120}
      value={value} onChangeText={onChange} editable={!disabled} error={error} />;
  }
  const opciones = filtrarRazas(catalogo?.razas ?? [], busqueda);
  const opcionEspecial = (titulo: string, accion: () => void, seleccionada: boolean) => (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: seleccionada }} onPress={accion}
      style={[styles.option, seleccionada && styles.selected]}>
      <Text style={styles.text}>{titulo}</Text>
      {seleccionada && <Ionicons name="checkmark" size={20} color={AppColors.accent} />}
    </Pressable>
  );
  return <View style={styles.field}>
    <Text style={styles.label}>Raza</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`Raza: ${value || 'Seleccionar raza'}`}
      accessibilityState={{ disabled, expanded: abierto }} disabled={disabled} onPress={() => setAbierto(true)}
      style={[styles.trigger, !!error && styles.invalid]}>
      <Text style={[styles.text, !value && styles.muted]}>{manual ? 'Otra raza' : value || 'Seleccionar raza'}</Text>
      <Ionicons name="chevron-down" size={20} color={AppColors.textSecondary} />
    </Pressable>
    {manual && <FormInput label="Escribe la raza" placeholder="Nombre de la raza" value={value} onChangeText={onChange}
      editable={!disabled} maxLength={120} autoCapitalize="words" />}
    <Text style={styles.hint}>Si no tiene una raza definida, elige Mestizo. Si no la conoces, puedes indicarlo.</Text>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <Modal visible={abierto} animationType="slide" transparent onRequestClose={cerrar}>
      <SafeAreaView style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
          <View style={styles.panel} accessibilityViewIsModal>
            <View style={styles.header}>
              <Text accessibilityRole="header" style={styles.title}>Razas de {especie === 'Perro' ? 'perros' : 'gatos'}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Cerrar lista de razas" onPress={cerrar} style={styles.close}>
                <Ionicons name="close" size={24} color={AppColors.text} />
              </Pressable>
            </View>
            <FormInput icon="search-outline" label="Buscar raza" placeholder="Escribe para buscar" value={busqueda}
              onChangeText={setBusqueda} autoCorrect={false} autoCapitalize="none" />
            <View style={styles.special}>
              {opcionEspecial(RAZA_MESTIZA, () => elegir(RAZA_MESTIZA), !manual && value === RAZA_MESTIZA)}
              {opcionEspecial('No conozco su raza', () => elegir(RAZA_DESCONOCIDA), !manual && value === RAZA_DESCONOCIDA)}
              {opcionEspecial('Otra raza · escribir', escribir, manual)}
            </View>
            {cargando && <View style={styles.loading}><ActivityIndicator color={AppColors.accent} /><Text style={styles.hint}>Cargando razas…</Text></View>}
            {errorCarga && <View style={styles.notice}>
              <Text accessibilityRole="alert" style={styles.hint}>No pudimos cargar la lista. Puedes elegir una opción de arriba o escribir la raza.</Text>
              <Pressable accessibilityRole="button" onPress={reintentar} style={styles.retry}><Text style={styles.link}>Reintentar</Text></Pressable>
            </View>}
            {catalogo && <Text style={styles.hint}>Catálogo: {catalogo.fuente}{catalogo.desactualizado ? ' · Copia guardada' : ''}.</Text>}
            <FlatList style={styles.list} data={opciones} keyExtractor={(raza) => raza} keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => opcionEspecial(item, () => elegir(item), !manual && value === item)}
              ListEmptyComponent={!cargando && !errorCarga ? <Text style={styles.empty}>No encontramos esa raza. Puedes usar «Otra raza · escribir».</Text> : undefined} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  </View>;
}

const createStyles = (AppColors: AppPalette) => (StyleSheet.create({
  field: { gap: 6 }, label: { color: AppColors.text, fontSize: 15, fontWeight: '600' },
  trigger: { minHeight: 52, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: AppColors.textMuted, backgroundColor: AppColors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  text: { color: AppColors.text, fontSize: 15, flexShrink: 1 },
  muted: { color: AppColors.textSecondary }, invalid: { borderColor: AppColors.danger },
  hint: { fontSize: 13, color: AppColors.textSecondary, lineHeight: 19 },
  error: { color: AppColors.danger, fontSize: 14 },
  overlay: { flex: 1, backgroundColor: '#0008', padding: 12 },
  keyboard: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  panel: { flex: 1, width: '100%', maxWidth: 600, maxHeight: 760, backgroundColor: AppColors.surface, borderRadius: 20, padding: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { color: AppColors.text, fontSize: 20, fontWeight: '800', flexShrink: 1 },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  special: { borderBottomWidth: 1, borderBottomColor: AppColors.border, paddingBottom: 8 },
  option: { minHeight: 48, padding: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  selected: { backgroundColor: AppColors.infoSoft },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notice: { padding: 10, backgroundColor: AppColors.infoSoft, borderRadius: 10 },
  retry: { paddingVertical: 12, alignSelf: 'flex-start' },
  link: { color: AppColors.accent, fontSize: 14, fontWeight: '600' },
  list: { flex: 1 }, empty: { padding: 12, color: AppColors.textSecondary, lineHeight: 21 },
}));
