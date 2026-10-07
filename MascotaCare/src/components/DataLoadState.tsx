import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors } from '@/constants/theme';
import type { EstadoCargaDatos } from '@/types';

interface Props {
  activo?: boolean;
  estado: EstadoCargaDatos;
  modoDemo: boolean;
  hayCambiosLocales?: boolean;
  reintentar: () => Promise<void>;
  reintentarGuardado: () => Promise<void>;
  salir: () => void;
  children: ReactNode;
}

/** Procedencia, actualización y guardado comparten el mismo aviso visible. */
export default function DataLoadState({
  activo = true, estado, modoDemo, hayCambiosLocales = false,
  reintentar, reintentarGuardado, salir, children,
}: Props) {
  const insets = useSafeAreaInsets();
  const cargando = ['inicial', 'recuperando', 'cargando'].includes(estado.estado);
  const ocupado = cargando || estado.guardandoCache;
  const mostrarContenido = !activo || estado.datosDisponibles;
  const procedencia = estado.procedencia === 'cache' ? 'Datos guardados en este dispositivo'
    : modoDemo ? 'Modo demostración · datos de ejemplo' : 'Datos actualizados';
  const fecha = estado.actualizadoEn ? new Date(estado.actualizadoEn).toLocaleString('es-PE') : null;

  return (
    <View style={styles.container}>
      {activo && (
        <View style={estado.datosDisponibles ? [styles.notice, { paddingTop: Math.max(12, insets.top) }] : styles.initial}
          accessibilityLiveRegion="polite">
          {cargando && <ActivityIndicator color={AppColors.primary} accessibilityLabel="Actualizando datos" />}
          <Text style={styles.message}>
            {estado.datosDisponibles ? `${modoDemo && estado.procedencia === 'cache' ? 'Demostración · ' : ''}${procedencia}${fecha ? ` · ${fecha}` : ''}`
              : estado.estado === 'recuperando' ? 'Recuperando tus datos…' : cargando ? 'Cargando tus datos…' : 'No se pudieron cargar tus datos.'}
          </Text>
          {estado.datosDisponibles && cargando && <Text style={styles.detail}>Buscando cambios…</Text>}
          {estado.error && <Text accessibilityRole="alert" style={styles.error}>{estado.error}</Text>}
          {estado.errorCache && <Text accessibilityRole="alert" style={styles.error}>{estado.errorCache}</Text>}
          {estado.guardandoCache && <Text style={styles.detail}>Guardando copia en este dispositivo…</Text>}
          {hayCambiosLocales && <Text style={styles.detail}>Tus ediciones locales se conservan durante esta sesión.</Text>}
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" disabled={ocupado} style={[styles.button, ocupado && styles.disabled]}
              onPress={() => { void reintentar(); }}>
              <Text style={styles.buttonText}>{estado.estado === 'error' ? 'Reintentar' : 'Actualizar'}</Text>
            </Pressable>
            {estado.errorCache && estado.datosDisponibles && (
              <Pressable accessibilityRole="button" disabled={ocupado} style={[styles.button, ocupado && styles.disabled]}
                onPress={() => { void reintentarGuardado(); }}>
                <Text style={styles.buttonText}>Guardar copia</Text>
              </Pressable>
            )}
            {!estado.datosDisponibles && (
              <Pressable accessibilityRole="button" onPress={salir} style={styles.exit}>
                <Text style={styles.exitText}>Cerrar sesión</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
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
  content: { flex: 1 }, hidden: { display: 'none' },
  initial: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  notice: { padding: 12, gap: 6, backgroundColor: AppColors.infoSoft },
  message: { fontSize: 14, color: AppColors.text, textAlign: 'center' },
  detail: { color: AppColors.textSecondary, fontSize: 12, textAlign: 'center' },
  error: { color: AppColors.danger, fontSize: 14, textAlign: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  button: { padding: 10, minHeight: 44, borderRadius: 12, backgroundColor: AppColors.primary, justifyContent: 'center' },
  disabled: { opacity: 0.5 },
  buttonText: { fontWeight: '600', color: '#FFFFFF' },
  exit: { padding: 12, minHeight: 44 },
  exitText: { color: AppColors.primary, fontWeight: '600' },
});
