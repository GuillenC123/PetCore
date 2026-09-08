// ============================================================================
// _layout.tsx - Raíz de la aplicación MascotaCare (navegación)
// ----------------------------------------------------------------------------
// Define el Stack raíz con los grupos de pantallas:
//   * (tabs)           -> pantallas principales con barra inferior.
//   * (auth)           -> Login y Registro.
//   * recordatorios    -> modal que se abre con la campana.
//
// El grupo (tabs) está "protegido": solo se puede acceder si hay un usuario
// autenticado (state.autenticado). Si no hay sesión, expo-router redirige
// automáticamente al login. Este patrón se logra con <Stack.Protected>.
//
// El AuthProvider envuelve todo el árbol para que cualquier pantalla acceda al
// contexto de autenticación.
// ============================================================================

import * as SplashScreen from 'expo-splash-screen';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { AuthProvider, useAuth } from '@/context/AuthContext';

// Evita que el splash desaparezca antes de que la app esté lista.
SplashScreen.preventAutoHideAsync();

/**
 * Navegador que decide cuál grupo mostrar según el estado de autenticación.
 * Necesita estar dentro del AuthProvider para leer useAuth().
 */
function RootNavigator() {
  const { usuario } = useAuth();
  const autenticado = usuario !== null;

  return (
    <Stack
      screenOptions={{
        headerShown: false, // Cada pantalla dibuja su propia cabecera.
        contentStyle: { backgroundColor: '#F4F6F9' },
      }}>
      {/* Grupo protegido: pantallas principales de la app. */}
      <Stack.Protected guard={autenticado}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="mascota-detalle" />
        <Stack.Screen name="nueva-mascota" />
        <Stack.Screen name="nueva-cita" />
        <Stack.Screen name="editar-perfil" />
        <Stack.Screen name="ayuda" />
      </Stack.Protected>

      {/* Grupo público: acceso/registro. */}
      <Stack.Protected guard={!autenticado}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      {/* Modal de recordatorios (accesible con o sin sesión). */}
      <Stack.Screen
        name="recordatorios"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <RootNavigator />
        <StatusBar style="dark" />
      </AuthProvider>
    </ThemeProvider>
  );
}
