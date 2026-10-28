import { abrirAjustesPermisos, PermisoCamaraError } from '@/services/permisos';
import { useAppColors } from '@/context/AppearanceContext';
import type { AppPalette } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { seleccionarFoto, type OrigenFoto } from '@/services/fotos';

interface Props {
  value?: string | null;
  onChange: (foto: string | null) => void | Promise<void>;
  label: string;
  usuario?: boolean;
  comprobante?: boolean;
  disabled?: boolean;
  onBusyChange?: (ocupado: boolean) => void;
}

export default function PhotoField({ value, onChange, label, usuario, comprobante, disabled, onBusyChange }: Props) {
  const AppColors = useAppColors();
  const styles = createStyles(AppColors);

  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [ajustes, setAjustes] = useState(false);
  const bloqueo = useRef(false);
  const ejecutar = async (quitar = false, origen: OrigenFoto = 'galeria') => {
    if (disabled || bloqueo.current) return;
    bloqueo.current = true;
    setOcupado(true); onBusyChange?.(true); setError(''); setAjustes(false);
    try {
      const foto = quitar ? null : await seleccionarFoto(origen, !comprobante);
      if (quitar || foto !== null) await onChange(foto);
    } catch (causa) {
      setAjustes(causa instanceof PermisoCamaraError && causa.bloqueado);
      setError(causa instanceof Error ? causa.message : 'No se pudo abrir la foto. Revisa el acceso a tus fotos e inténtalo de nuevo.');
    } finally {
      bloqueo.current = false;
      setOcupado(false); onBusyChange?.(false);
    }
  };
  return <View style={styles.container}>
    <Text style={styles.label}>{label}</Text>
    {value ? <Image source={{ uri: value }} contentFit={comprobante ? "contain" : "cover"} accessibilityLabel={label} style={[styles.photo, comprobante && styles.documento]} />
      : <View style={styles.placeholder}><Ionicons name={usuario ? 'person' : 'paw'} size={42} color={AppColors.accent} /></View>}
    <Pressable accessibilityRole="button" accessibilityLabel={`Seleccionar ${label.toLowerCase()}`}
      accessibilityState={{ disabled: disabled || ocupado, busy: ocupado }} disabled={disabled || ocupado}
      onPress={() => void ejecutar()} style={styles.button}>
      <Ionicons name="image-outline" size={20} color={AppColors.accent} />
      <Text style={styles.action}>{ocupado ? 'Preparando foto…' : value ? 'Cambiar foto' : 'Subir foto'}</Text>
    </Pressable>
    {Platform.OS !== 'web' && <Pressable accessibilityRole="button" accessibilityLabel={`Tomar ${label.toLowerCase()}`}
      accessibilityState={{ disabled: disabled || ocupado, busy: ocupado }} disabled={disabled || ocupado}
      onPress={() => void ejecutar(false, 'camara')} style={styles.button}>
      <Ionicons name="camera-outline" size={20} color={AppColors.accent} />
      <Text style={styles.action}>Tomar foto</Text>
    </Pressable>}
    {!!value && <Pressable accessibilityRole="button" disabled={disabled || ocupado} onPress={() => void ejecutar(true)} style={styles.button}>
      <Text style={styles.remove}>Quitar foto</Text>
    </Pressable>}
    {ajustes && <Pressable accessibilityRole="button" onPress={() => void abrirAjustesPermisos().catch(() => setError('No se pudo abrir Ajustes. Abre los permisos de PetCore desde los ajustes del dispositivo.'))} style={styles.button}><Text style={styles.action}>Abrir Ajustes de cámara</Text></Pressable>}
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  </View>;
}

const createStyles = (AppColors: AppPalette) => (StyleSheet.create({
  container: { alignItems: 'center', gap: 8 },
  label: { color: AppColors.text, fontSize: 15, fontWeight: '700' },
  documento: { width: '100%', height: 180, borderRadius: 12 },
  photo: { width: 112, height: 112, borderRadius: 56, backgroundColor: AppColors.infoSoft },
  placeholder: { width: 112, height: 112, borderRadius: 56, backgroundColor: AppColors.infoSoft, alignItems: 'center', justifyContent: 'center' },
  button: { minHeight: 44, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  action: { color: AppColors.accent, fontSize: 15, fontWeight: '600' },
  remove: { color: AppColors.danger, fontSize: 14 },
  error: { color: AppColors.danger, fontSize: 14, textAlign: 'center' },
}));
