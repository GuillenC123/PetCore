// ============================================================================
// nueva-mascota.tsx - Formulario "Añadir nueva mascota"
// ----------------------------------------------------------------------------
// Formulario real con validación lógica y retroalimentación visible. Usa
// useState para manejar los campos y los errores. Al guardar crea una nueva
// mascota mediante agregarMascota() del contexto y vuelve a la lista.
//
// Campos validados:
//   * Nombre  (obligatorio, mínimo 2 caracteres).
//   * Especie (Perro / Gato) seleccionada con chips.
//   * Raza    (obligatorio).
//   * Edad    (obligatorio, p. ej. "3 años").
// ============================================================================

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
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
import type { EstadoMascota } from '@/types';
import { validarTexto } from '@/utils/validaciones';

// Especies disponibles para el selector rápido.
const ESPECIES = ['Perro', 'Gato', 'Otro'] as const;

// Estados de salud permitidos (por defecto "saludable" al registrarse).
type Especie = (typeof ESPECIES)[number];

export default function NuevaMascotaScreen() {
  // Estado local de cada campo del formulario.
  const [nombre, setNombre] = useState('');
  const [especie, setEspecie] = useState<Especie>('Perro');
  const [raza, setRaza] = useState('');
  const [edad, setEdad] = useState('');

  // Errores por campo (se limpian al editar; se rellenan al validar).
  const [errores, setErrores] = useState<Record<string, string>>({});

  const { agregarMascota } = useAuth();

  // -------------------------------------------------------------------------
  // VALIDACIÓN: comprueba cada campo y devuelve true si todo es correcto.
  // -------------------------------------------------------------------------
  const validar = () => {
    const err: Record<string, string> = {};
    const errorNombre = validarTexto(nombre, 120, 2);
    if (errorNombre) err.nombre = errorNombre;
    const errorRaza = validarTexto(raza, 120);
    if (errorRaza) err.raza = errorRaza;
    const errorEdad = validarTexto(edad, 60);
    if (errorEdad) err.edad = errorEdad;

    setErrores(err);
    return Object.keys(err).length === 0;
  };

  // -------------------------------------------------------------------------
  // GUARDAR: si pasa la validación, crea la mascota y vuelve a la lista.
  // -------------------------------------------------------------------------
  const guardar = () => {
    if (!validar()) return;

    // La mascota arranca con estado "saludable"; en avances futuros se podrá
    // elegir otro estado al crearla.
    agregarMascota({
      nombre: nombre.trim(),
      especie,
      raza: raza.trim(),
      edad: edad.trim(),
      estado: 'saludable' as EstadoMascota,
      imagen: null,
    });

    // Navegamos hacia atrás (a Mis Mascotas) filmando la nueva tarjeta.
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Cabecera con botón atrás y título. */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Ionicons name="arrow-back" size={24} color={AppColors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Añadir Mascota</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Subtítulo descriptivo. */}
          <Text style={styles.subtitle}>
            Registra a tu nuevo compañero para empezar a cuidarlo.
          </Text>

          {/* ---- Camapos del formulario ---- */}
          <View style={styles.form}>
            <FormInput
              icon="paw-outline"
              placeholder="Nombre de la mascota"
              value={nombre}
              onChangeText={setNombre}
              autoCapitalize="words"
              error={errores.nombre}
            />

            {/* Selector de especie a través de chips táctiles. */}
            <View style={styles.especieBlock}>
              <Text style={styles.label}>Especie</Text>
              <View style={styles.chipsRow}>
                {ESPECIES.map((esp) => {
                  const activo = especie === esp;
                  return (
                    <Pressable
                      key={esp}
                      onPress={() => setEspecie(esp)}
                      style={[styles.chip, activo && styles.chipActivo]}>
                      <Text style={[styles.chipText, activo && styles.chipTextActivo]}>
                        {esp}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <FormInput
              icon="information-circle-outline"
              placeholder="Raza (ej. Golden Retriever)"
              value={raza}
              onChangeText={setRaza}
              autoCapitalize="words"
              error={errores.raza}
            />

            <FormInput
              icon="fitness-outline"
              placeholder="Edad (ej. 3 años)"
              value={edad}
              onChangeText={setEdad}
              error={errores.edad}
            />
          </View>

          {/* ---- Botón guardar ---- */}
          <Pressable
            onPress={guardar}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
            <Text style={styles.buttonText}>Guardar Mascota</Text>
          </Pressable>
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
    width: 42,
    height: 42,
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
  form: {
    gap: 16,
  },
  especieBlock: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: AppColors.text,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  chip: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: AppColors.surface,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  chipActivo: {
    backgroundColor: AppColors.infoSoft,
    borderColor: AppColors.primaryDark,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
  chipTextActivo: {
    color: AppColors.primaryDark,
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
});