import { AdaptiveColumns, layoutStyles } from '@/components/AdaptiveLayout';
// ============================================================================
// nueva-mascota.tsx - Formulario "Añadir nueva mascota"
// ----------------------------------------------------------------------------
// Formulario real con validación lógica y retroalimentación visible. Usa
// useState para manejar los campos y los errores. Al guardar crea una nueva
// mascota mediante agregarMascota() del contexto y vuelve a la lista.
//
// Campos validados:
//   * Nombre  (obligatorio, mínimo 2 caracteres).
//   * Datos básicos compartidos con la ficha de salud.
//   * Raza    (obligatorio).
//   * Edad    (obligatorio, p. ej. "3 años").
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import FormInput from '@/components/FormInput';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useAviso } from '@/context/AvisosContext';
import type { EstadoMascota } from '@/types';
import PetDataFields, { datosIniciales, prepararDatos } from '@/components/PetDataFields';
import { validarTexto } from '@/utils/validaciones';

export default function NuevaMascotaScreen() {
  // Estado local de cada campo del formulario.
  const [nombre, setNombre] = useState('');
  const [datos, setDatos] = useState(datosIniciales);
  const [raza, setRaza] = useState('');

  // Errores por campo (se limpian al editar; se rellenan al validar).
  const [errores, setErrores] = useState<Record<string, string>>({});

  const { agregarMascota, modoDemo } = useAuth();
  const mostrarAviso = useAviso();
  const bloqueo = useRef(false);
  const [guardando, setGuardando] = useState(false);

  // -------------------------------------------------------------------------
  // VALIDACIÓN: comprueba cada campo y devuelve true si todo es correcto.
  // -------------------------------------------------------------------------
  const validar = () => {
    const err: Record<string, string> = {};
    const errorNombre = validarTexto(nombre, 120, 2);
    if (errorNombre) err.nombre = errorNombre;
    const errorRaza = validarTexto(raza, 120);
    if (errorRaza) err.raza = errorRaza;
    try { prepararDatos(datos); }
    catch (error) { err.general = error instanceof Error ? error.message : 'Revisa los datos de la mascota.'; }

    setErrores(err);
    return Object.keys(err).length === 0;
  };

  // -------------------------------------------------------------------------
  // GUARDAR: si pasa la validación, crea la mascota y vuelve a la lista.
  // -------------------------------------------------------------------------
  const guardar = async () => {
    if (bloqueo.current || !validar()) return;
    bloqueo.current = true;
    setGuardando(true);

    try {
      await agregarMascota({
        nombre: nombre.trim(),
        ...prepararDatos(datos),
        raza: raza.trim(),
        estado: 'saludable' as EstadoMascota,
        imagen: null,
      });
      mostrarAviso(modoDemo ? 'Mascota registrada para esta sesión.' : 'Mascota registrada.');
      router.back();
    } catch (e) {
      setErrores({ general: e instanceof Error ? e.message : 'No se pudo guardar la mascota.' });
    } finally {
      bloqueo.current = false;
      setGuardando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Cabecera con botón atrás y título. */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button" accessibilityLabel="Volver"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Ionicons name="arrow-back" size={24} color={AppColors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Añadir Mascota</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, layoutStyles.form]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Subtítulo descriptivo. */}
          <Text style={styles.subtitle}>
            Registra a tu nuevo compañero para empezar a cuidarlo.
          </Text>

          {/* ---- Camapos del formulario ---- */}
          <AdaptiveColumns>
            <FormInput
              icon="paw-outline"
              placeholder="Nombre de la mascota"
              label="Nombre de la mascota"
              value={nombre}
              onChangeText={setNombre}
              autoCapitalize="words"
              error={errores.nombre}
            />

            <FormInput
              icon="information-circle-outline"
              placeholder="Raza (ej. Golden Retriever)"
              label="Raza"
              value={raza}
              onChangeText={setRaza}
              autoCapitalize="words"
              error={errores.raza}
            />

          </AdaptiveColumns>
          <PetDataFields value={datos} onChange={setDatos} disabled={guardando} />

          {/* ---- Botón guardar ---- */}
          <Pressable
            onPress={guardar}
            disabled={guardando}
            accessibilityState={{ disabled: guardando, busy: guardando }}
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
            <Text style={styles.buttonText}>{guardando ? 'Guardando…' : 'Guardar Mascota'}</Text>
          </Pressable>
          {!!errores.general && <Text style={styles.error} accessibilityRole="alert">{errores.general}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: AppColors.text,
  },
  pressed: {
    opacity: 0.6,
  },
  content: {
    padding: 20,
    gap: 18,
  },
  subtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    lineHeight: 20,
  },
  button: {
    backgroundColor: AppColors.primaryDark,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  error: { fontSize: 14, color: AppColors.danger },
});
