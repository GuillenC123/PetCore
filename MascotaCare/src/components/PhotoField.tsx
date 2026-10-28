import { useAppColors } from '@/context/AppearanceContext';
import type { AppPalette } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { seleccionarFoto } from '@/services/fotos';

interface Props {
  value?: string | null;
  onChange: (foto: string | null) => void | Promise<void>;
  label: string;
  usuario?: boolean;
  disabled?: boolean;
  onBusyChange?: (ocupado: boolean) => void;
}

export default function PhotoField({ value, onChange, label, usuario, disabled, onBusyChange }: Props) {
  const AppColors = useAppColors();
  const styles = createStyles(AppColors);

  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const bloqueo = useRef(false);
  const ejecutar = async (quitar = false) => {
    if (disabled || bloqueo.current) return;
    bloqueo.current = true;
    setOcupado(true); onBusyChange?.(true); setError('');
    try {
      const foto = quitar ? null : await seleccionarFoto();
      if (quitar || foto !== null) await onChange(foto);
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No se pudo abrir la foto. Revisa el acceso a tus fotos e inténtalo de nuevo.');
    } finally {
      bloqueo.current = false;
      setOcupado(false); onBusyChange?.(false);
    }
  };
  return <View style={styles.container}>
    <Text style={styles.label}>{label}</Text>
    {value ? <Image source={{ uri: value }} contentFit="cover" accessibilityLabel={label} style={styles.photo} />
      : <View style={styles.placeholder}><Ionicons name={usuario ? 'person' : 'paw'} size={42} color={AppColors.accent} /></View>}
    <Pressable accessibilityRole="button" accessibilityLabel={`Seleccionar ${label.toLowerCase()}`}
      accessibilityState={{ disabled: disabled || ocupado, busy: ocupado }} disabled={disabled || ocupado}
      onPress={() => void ejecutar()} style={styles.button}>
      <Ionicons name="image-outline" size={20} color={AppColors.accent} />
      <Text style={styles.action}>{ocupado ? 'Preparando foto…' : value ? 'Cambiar foto' : 'Subir foto'}</Text>
    </Pressable>
    {!!value && <Pressable accessibilityRole="button" disabled={disabled || ocupado} onPress={() => void ejecutar(true)} style={styles.button}>
      <Text style={styles.remove}>Quitar foto</Text>
    </Pressable>}
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  </View>;
}

const createStyles = (AppColors: AppPalette) => (StyleSheet.create({
  container: { alignItems: 'center', gap: 8 },
  label: { color: AppColors.text, fontSize: 15, fontWeight: '700' },
  photo: { width: 112, height: 112, borderRadius: 56, backgroundColor: AppColors.infoSoft },
  placeholder: { width: 112, height: 112, borderRadius: 56, backgroundColor: AppColors.infoSoft, alignItems: 'center', justifyContent: 'center' },
  button: { minHeight: 44, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  action: { color: AppColors.accent, fontSize: 15, fontWeight: '600' },
  remove: { color: AppColors.danger, fontSize: 14 },
  error: { color: AppColors.danger, fontSize: 14, textAlign: 'center' },
}));
