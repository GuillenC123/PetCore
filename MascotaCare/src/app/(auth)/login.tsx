import AnimatedPressable from '@/components/AnimatedPressable';
import { useAppColors } from '@/context/AppearanceContext';
import type { AppPalette } from '@/constants/theme';
import { layoutStyles } from '@/components/AdaptiveLayout';
// ============================================================================
// (auth)/login.tsx - Pantalla de Iniciar Sesión
// ----------------------------------------------------------------------------
// Formulario de acceso con validación de campos:
//   * Correo electrónico (formato válido).
//   * Contraseña (mínimo 6 caracteres).
// Al enviar llama a "login" del contexto. También incluye un enlace para ir al
// Registro. Muestra las credenciales de demostración como ayuda.
// ============================================================================

import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import PetScreen from '@/components/PetScreen';

import FormInput from '@/components/FormInput';
import PetIllustration from '@/components/PetIllustration';
import { useAuth } from '@/context/AuthContext';
import { validarCorreo, validarPassword } from '@/utils/validaciones';

export default function LoginScreen() {
  const AppColors = useAppColors();
  const styles = createStyles(AppColors);

  // Estado de los campos del formulario.
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  // Errores por campo y error global de la API.
  const [errores, setErrores] = useState<{ correo?: string; password?: string }>({});
  const [errorApi, setErrorApi] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const { login } = useAuth();

  // --- Validación de campos (reglas de negocio de la UI) ---
  const validar = () => {
    const err: Record<string, string> = {};
    const errorCorreo = validarCorreo(correo);
    if (errorCorreo) err.correo = errorCorreo;
    const errorPassword = validarPassword(password);
    if (errorPassword) err.password = errorPassword;

    setErrores(err);
    return Object.keys(err).length === 0;
  };

  // --- Envío del formulario ---
  const manejarLogin = async () => {
    setErrorApi(null);
    if (!validar()) return;

    setCargando(true);
    try {
      await login(correo, password);
      // Al iniciar sesión, el Stack de la raíz redirige a (tabs). No hacemos sí
      // navegación manual porque el guard de autenticación lo hace solo.
    } catch (err) {
      setErrorApi(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <PetScreen style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, layoutStyles.auth]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Marca de la app. */}
          <View style={styles.brandBlock}>
            <PetIllustration />
            <Text style={styles.appName}>PetCore</Text>
            <Text style={styles.tagline}>Más momentos juntos, más huellas felices.</Text>
          </View>

          {/* Título del formulario. */}
          <Text style={styles.title}>Iniciar Sesión</Text>

          {/* Campos de acceso. */}
          <View style={styles.form}>
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
          </View>

          {/* Error global (de la API). */}
          {errorApi ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.errorApi}>{errorApi}</Text> : null}

          {/* Botón de acceso. */}
          <AnimatedPressable
            accessibilityRole="button"
            onPress={manejarLogin}
            disabled={cargando}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
            {cargando ? (
              <ActivityIndicator color={AppColors.onPrimary} />
            ) : (
              <Text style={styles.buttonText}>Ingresar</Text>
            )}
          </AnimatedPressable>

          {/* Ayuda del modo demo. */}
          <Text style={styles.demoHint}>
            Demo: ana.garcia@email.com / 123456
          </Text>

          {/* Enlace al registro. */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>¿No tienes cuenta? </Text>
            <Link href="/registro" style={styles.link}>
              Regístrate
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </PetScreen>
  );
}

const createStyles = (AppColors: AppPalette) => (StyleSheet.create({
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
  brandBlock: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: AppColors.text,
  },
  tagline: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: AppColors.text,
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
    color: AppColors.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  demoHint: {
    textAlign: 'center',
    fontSize: 12,
    color: AppColors.textSecondary,
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
    color: AppColors.accent,
  },
}));
