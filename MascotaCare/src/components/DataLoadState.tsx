import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';
import type { EstadoCargaDatos } from '@/types';

interface Props {
  activo?: boolean;
  estado: EstadoCargaDatos;
  modoDemo: boolean;
  reintentar: () => Promise<void>;
  salir: () => void;
  children: ReactNode;
}

/** Evita confundir una consulta pendiente o fallida con una lista vacía. */
export default function DataLoadState({ activo = true, estado, modoDemo, reintentar, salir, children }: Props) {
  const cargando = estado.estado === 'inicial' || estado.estado === 'cargando';
  const mostrarAviso = activo && (!estado.datosDisponibles || estado.estado !== 'listo' || modoDemo);
  const mostrarContenido = !activo || estado.datosDisponibles;

  return (
    <View style={styles.container}>
      {mostrarAviso && (
        <View style={estado.datosDisponibles ? styles.notice : styles.initial} accessibilityLiveRegion="polite">
          {cargando && <ActivityIndicator size="large" color={AppColors.primary} accessibilityLabel="Cargando datos" />}
          <Text accessibilityRole={estado.estado === 'error' ? 'alert' : 'text'} style={styles.message}>
            {estado.estado === 'error' ? estado.error : cargando ? 'Cargando tus datos…' : 'Modo demostración · datos de ejemplo.'}
          </Text>
          {estado.estado === 'error' && (
            <Pressable accessibilityRole="button" style={styles.button} onPress={() => { void reintentar(); }}>
              <Text style={styles.buttonText}>Reintentar</Text>
            </Pressable>
          )}
          {!estado.datosDisponibles && (
            <Pressable accessibilityRole="button" onPress={salir} style={styles.exit}>
              <Text style={styles.exitText}>Cerrar sesión</Text>
            </Pressable>
          )}
        </View>
      )}
      {/* El navegador permanece montado; las pantallas se ocultan hasta resolver la consulta. */}
      <View style={mostrarContenido ? styles.content : styles.hidden}
        accessibilityElementsHidden={!mostrarContenido}
        importantForAccessibility={mostrarContenido ? 'auto' : 'no-hide-descendants'}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.background },
  content: { flex: 1 },
  hidden: { display: 'none' },
  initial: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 },
  notice: { padding: 12, gap: 8, backgroundColor: AppColors.infoSoft },
  message: { fontSize: 16, color: AppColors.text, textAlign: 'center' },
  button: { padding: 14, minHeight: 48, borderRadius: 12, backgroundColor: AppColors.primary, alignItems: 'center' },
  buttonText: { fontWeight: '600', color: '#FFFFFF' },
  exit: { padding: 14, minHeight: 48 },
  exitText: { color: AppColors.primary, fontWeight: '600' },
});
