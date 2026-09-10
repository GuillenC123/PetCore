// ============================================================================
// (auth)/registro.tsx - Pantalla de Registro de Cuenta
// ----------------------------------------------------------------------------
// Formulario para crear una cuenta nueva, con validación detallada de campos:
//   * Nombre completo (mínimo 2 caracteres).
//   * Correo electrónico (formato válido).
//   * Contraseña (mínimo 6 caracteres).
//   * Confirmación de contraseña (debe coincidir).
// Al enviar llama a "registro" del contexto (solo funciona con la API activa).
// ============================================================================

import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
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
import { validarTexto, validarCorreo, validarPassword } from '@/utils/validaciones';

export default function RegistroScreen() {
  // Estado de cada campo del formulario.
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  // Errores por campo y error global de la API.
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorApi, setErrorApi] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const { registro } = useAuth();

  // --- Validación de todos los campos (reglas de negocio de la UI) ---
  const validar = () => {
    const err: Record<string, string> = {};
    const errorNombre = validarTexto(nombre, 120, 2);
    if (errorNombre) err.nombre = errorNombre;
    const errorCorreo = validarCorreo(correo);
    if (errorCorreo) err.correo = errorCorreo;
    const errorPassword = validarPassword(password);
    if (errorPassword) err.password = errorPassword;

    if (confirmar !== password) {
      err.confirmar = 'Las contraseñas no coinciden.';
    }

    setErrores(err);
    return Object.keys(err).length === 0;
  };

  // --- Envío del registro ---
  const manejarRegistro = async () => {
    setErrorApi(null);
    if (!validar()) return;

    setCargando(true);
    try {
      await registro(nombre, correo, password);
      // Al crearse la sesión, el guard de la raíz redirige automáticamente a (tabs).
    } catch (err) {
      setErrorApi(err instanceof Error ? err.message : 'No se pudo crear la cuenta.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Título del formulario. */}
          <View>
            <Text style={styles.title}>Crear Cuenta</Text>
            <Text style={styles.subtitle}>Regístrate para gestionar a tus mascotas.</Text>
          </View>

          {/* Campos del formulario. */}
          <View style={styles.form}>
            <FormInput
              icon="person-outline"
              placeholder="Nombre completo"
              label="Nombre completo"
              value={nombre}
              onChangeText={setNombre}
              autoCapitalize="words"
              error={errores.nombre}
            />
            <FormInput
              icon="mail-outline"
              placeholder="Correo electrónico"
              label="Correo electrónico"
              value={correo}
              onChangeText={setCorreo}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errores.correo}
            />
            <FormInput
              icon="lock-closed-outline"
              placeholder="Contraseña"
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              secure
              autoCapitalize="none"
              error={errores.password}
            />
            <FormInput
              icon="shield-checkmark-outline"
              placeholder="Confirmar contraseña"
              label="Confirmar contraseña"
              value={confirmar}
              onChangeText={setConfirmar}
              secure
              autoCapitalize="none"
              error={errores.confirmar}
            />
          </View>

          {/* Error global (de la API). */}
          {errorApi ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.errorApi}>{errorApi}</Text> : null}

          {/* Botón de registro. */}
          <Pressable
            accessibilityRole="button"
            onPress={manejarRegistro}
            disabled={cargando}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
            {cargando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Registrarme</Text>
            )}
          </Pressable>

          {/* Enlace al login. */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
            <Link href="/login" style={styles.link}>
              Inicia sesión
            </Link>
          </View>
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
  content: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: AppColors.text,
  },
  subtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginTop: 4,
  },
  form: {
    gap: 14,
  },
  errorApi: {
    fontSize: 13,
    color: AppColors.danger,
    textAlign: 'center',
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
  },
  footerText: {
    fontSize: 14,
    color: AppColors.textSecondary,
  },
  link: {
    fontSize: 14,
    fontWeight: '700',
    color: AppColors.primaryDark,
  },
});
