// ============================================================================
// (auth)/_layout.tsx - Layout del grupo de autenticación
// ----------------------------------------------------------------------------
// Agrupa las pantallas de Login y Registro dentro de un Stack sin cabeceras
// (cada pantalla dibuja su propio contenido). Estas rutas solo son accesibles
// cuando NO hay sesión iniciada (lo garantiza el Stack.Protected de la raíz).
// ============================================================================

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="registro" />
    </Stack>
  );
}