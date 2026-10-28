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

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppearanceProvider, useAppearance } from '@/context/AppearanceContext';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AvisosProvider } from '@/context/AvisosContext';
import DataLoadState from '@/components/DataLoadState';

/**
 * Navegador que decide cuál grupo mostrar según el estado de autenticación.
 * Necesita estar dentro del AuthProvider para leer useAuth().
 */
function RootNavigator() {
  const { usuario, token, estadoDatos, modoDemo, cargarDatos, logout, reintentarGuardado, hayCambiosLocales } = useAuth();
  const { colors } = useAppearance();
  const autenticado = usuario !== null;

  const navigation = (
    <Stack
      screenOptions={{
        headerShown: false, // Cada pantalla dibuja su propia cabecera.
        contentStyle: { backgroundColor: colors.background },
      }}>
      {/* Grupo protegido: pantallas principales de la app. */}
      <Stack.Protected guard={autenticado} redirectTo="/login">
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="mascota-detalle" />
        <Stack.Screen name="salud/[seccion]" />
        <Stack.Screen name="nueva-mascota" />
        <Stack.Screen name="nueva-cita" />
        <Stack.Screen name="editar-cita" />
        <Stack.Screen name="editar-perfil" />
        <Stack.Screen name="ayuda" />
      </Stack.Protected>

      {/* Grupo público: acceso/registro. */}
      <Stack.Protected guard={!autenticado} redirectTo="/">
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      {/* Modal de recordatorios (accesible con o sin sesión). */}
      <Stack.Screen
        name="recordatorios"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
    </Stack>
  );

  return (
    <AvisosProvider key={token ?? 'sin-sesion'}>
      <DataLoadState activo={autenticado} estado={estadoDatos} modoDemo={modoDemo} reintentar={cargarDatos} salir={logout}
        reintentarGuardado={reintentarGuardado} hayCambiosLocales={hayCambiosLocales}>
        {navigation}
      </DataLoadState>
    </AvisosProvider>
  );
}

function ThemedRoot() {
  const { scheme, colors, ready } = useAppearance();
  if (!ready) return null;

  return (
    <ThemeProvider value={{ ...(scheme === 'dark' ? DarkTheme : DefaultTheme), colors: { ...(scheme === 'dark' ? DarkTheme : DefaultTheme).colors, background: colors.background, card: colors.surface, text: colors.text, border: colors.border, primary: colors.accent } }}>
      <AuthProvider>
        <RootNavigator />
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return <AppearanceProvider><ThemedRoot /></AppearanceProvider>;
}
