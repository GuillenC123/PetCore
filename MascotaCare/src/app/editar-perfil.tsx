import { useAppColors } from '@/context/AppearanceContext';
import type { AppPalette } from '@/constants/theme';
import { layoutStyles } from '@/components/AdaptiveLayout';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import PetScreen from '@/components/PetScreen';

import FormInput from '@/components/FormInput';
import PhotoField from '@/components/PhotoField';
import { useAuth } from '@/context/AuthContext';
import { validarCorreo, validarNombrePerfil } from '@/utils/validaciones';

export default function EditarPerfilScreen() {
  const AppColors = useAppColors();
  const styles = createStyles(AppColors);

  const { usuario, actualizarPerfil } = useAuth();
  // El borrador es independiente del contexto: cancelar no modifica el usuario.
  const [nombre, setNombre] = useState(usuario?.nombre ?? '');
  const [correo, setCorreo] = useState(usuario?.correo ?? '');
  const [imagen, setImagen] = useState(usuario?.imagen ?? null);
  const [preparandoFoto, setPreparandoFoto] = useState(false);
  const [errores, setErrores] = useState<{ nombre?: string; correo?: string; general?: string }>({});
  const [guardado, setGuardado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const volver = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/perfil');
  };

  const guardar = async () => {
    const nuevosErrores = {
      nombre: validarNombrePerfil(nombre),
      correo: validarCorreo(correo),
    };
    setErrores(nuevosErrores);
    setGuardado(false);
    if (nuevosErrores.nombre || nuevosErrores.correo || !usuario || guardando || preparandoFoto) return;
    setGuardando(true);
    try {
      await actualizarPerfil({ nombre, correo, imagen });
      setNombre(nombre.normalize('NFC').trim());
      setCorreo(correo.trim().toLowerCase());
      setGuardado(true);
    } catch (error) {
      setErrores({ general: error instanceof Error ? error.message : 'No se pudo actualizar el perfil.' });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <PetScreen style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={volver} accessibilityRole="button" accessibilityLabel="Volver al perfil"
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <Ionicons name="arrow-back" size={24} color={AppColors.text} />
          </Pressable>
          <Text style={styles.title}>Editar Perfil</Text>
          <View style={styles.back} />
        </View>
        <ScrollView contentContainerStyle={[styles.content, layoutStyles.form]} keyboardShouldPersistTaps="handled">
          <Text style={styles.subtitle}>Actualiza tu foto, nombre y correo electrónico.</Text>
          <PhotoField label="Foto de perfil" usuario value={imagen} disabled={guardando} onBusyChange={setPreparandoFoto}
            onChange={(foto) => { setImagen(foto); setGuardado(false); }} />
          <View style={styles.field}>
            <Text style={styles.label}>Nombre</Text>
            <FormInput icon="person-outline" accessibilityLabel="Nombre" placeholder="Nombre completo"
              value={nombre} autoCapitalize="words" error={errores.nombre}
              onChangeText={(valor) => {
                setNombre(valor);
                setGuardado(false);
                setErrores((actual) => ({ ...actual, nombre: undefined }));
              }} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Correo electrónico</Text>
            <FormInput icon="mail-outline" accessibilityLabel="Correo electrónico" placeholder="nombre@dominio.com"
              value={correo} keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
              error={errores.correo} onChangeText={(valor) => {
                setCorreo(valor);
                setGuardado(false);
                setErrores((actual) => ({ ...actual, correo: undefined }));
              }} />
          </View>
          {!!errores.general && <Text style={styles.error} accessibilityRole="alert">{errores.general}</Text>}
          {guardado ? (
            <Text style={styles.success} accessibilityRole="alert" accessibilityLiveRegion="polite">
              Perfil actualizado correctamente
            </Text>
          ) : null}
          <Pressable onPress={guardar} disabled={guardando || preparandoFoto} accessibilityRole="button"
            style={({ pressed }) => [styles.button, guardando && styles.disabled, pressed && styles.pressed]}>
            <Text style={styles.buttonText}>{guardando ? 'Guardando…' : 'Guardar cambios'}</Text>
          </Pressable>
          <Pressable onPress={volver} accessibilityRole="button"
            style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}>
            <Text style={styles.cancelText}>{guardado ? 'Volver al perfil' : 'Cancelar'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </PetScreen>
  );
}

const createStyles = (AppColors: AppPalette) => (StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.background },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  back: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21 },
  title: { fontSize: 18, fontWeight: '800', color: AppColors.text },
  content: { padding: 20, gap: 18 },
  subtitle: { fontSize: 14, lineHeight: 20, color: AppColors.textSecondary },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '700', color: AppColors.text },
  button: { backgroundColor: AppColors.primaryDark, borderRadius: 14, padding: 16, alignItems: 'center' },
  buttonText: { color: AppColors.onPrimary, fontSize: 16, fontWeight: '700' },
  cancel: { borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: AppColors.primaryDark },
  cancelText: { color: AppColors.accent, fontSize: 16, fontWeight: '700' },
  success: { color: AppColors.success, fontSize: 14, fontWeight: '600' },
  error: { color: AppColors.danger, fontSize: 14 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.55 },
}));
