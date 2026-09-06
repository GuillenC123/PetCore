import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import FormInput from '@/components/FormInput';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { validarCorreo, validarNombrePerfil } from '@/utils/validaciones';

export default function EditarPerfilScreen() {
  const { usuario, actualizarPerfil } = useAuth();
  // El borrador es independiente del contexto: cancelar no modifica el usuario.
  const [nombre, setNombre] = useState(usuario?.nombre ?? '');
  const [correo, setCorreo] = useState(usuario?.correo ?? '');
  const [errores, setErrores] = useState<{ nombre?: string; correo?: string }>({});
  const [guardado, setGuardado] = useState(false);

  const volver = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/perfil');
  };

  const guardar = () => {
    const nuevosErrores = {
      nombre: validarNombrePerfil(nombre),
      correo: validarCorreo(correo),
    };
    setErrores(nuevosErrores);
    setGuardado(false);
    if (nuevosErrores.nombre || nuevosErrores.correo || !usuario) return;

    actualizarPerfil({ nombre, correo });
    setNombre(nombre.normalize('NFC').trim());
    setCorreo(correo.trim().toLowerCase());
    setGuardado(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={volver} accessibilityRole="button" accessibilityLabel="Volver al perfil"
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <Ionicons name="arrow-back" size={24} color={AppColors.text} />
          </Pressable>
          <Text style={styles.title}>Editar Perfil</Text>
          <View style={styles.back} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.subtitle}>Actualiza tu nombre y correo electrónico.</Text>
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
          {guardado ? (
            <Text style={styles.success} accessibilityRole="alert" accessibilityLiveRegion="polite">
              Perfil actualizado correctamente
            </Text>
          ) : null}
          <Pressable onPress={guardar} accessibilityRole="button"
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
            <Text style={styles.buttonText}>Guardar cambios</Text>
          </Pressable>
          <Pressable onPress={volver} accessibilityRole="button"
            style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}>
            <Text style={styles.cancelText}>{guardado ? 'Volver al perfil' : 'Cancelar'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  cancel: { borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: AppColors.primaryDark },
  cancelText: { color: AppColors.primaryDark, fontSize: 16, fontWeight: '700' },
  success: { color: AppColors.success, fontSize: 14, fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
