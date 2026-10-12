import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppColors } from '@/constants/theme';

const AvisosContext = createContext<((mensaje: string) => void) | null>(null);

/** Confirmaciones de acciones: sobreviven a la navegación y caducan a los 3 segundos. */
export function AvisosProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [aviso, setAviso] = useState<{ mensaje: string } | null>(null);
  const mostrarAviso = useCallback((mensaje: string) => setAviso({ mensaje }), []);

  useEffect(() => {
    if (!aviso) return;
    const temporizador = setTimeout(() => setAviso(null), 3000);
    return () => clearTimeout(temporizador);
  }, [aviso]);

  return (
    <AvisosContext.Provider value={mostrarAviso}>
      <View style={styles.container}>
        {children}
        {aviso && (
          <View pointerEvents="none" style={[styles.position, { top: insets.top + 12 }]}>
            <View style={styles.notice}>
              <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.message}>
                {aviso.mensaje}
              </Text>
            </View>
          </View>
        )}
      </View>
    </AvisosContext.Provider>
  );
}

export function useAviso() {
  const mostrarAviso = useContext(AvisosContext);
  if (!mostrarAviso) throw new Error('useAviso debe usarse dentro de AvisosProvider.');
  return mostrarAviso;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  position: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 10 },
  notice: { backgroundColor: AppColors.successSoft, borderColor: AppColors.success,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 14, maxWidth: 520 },
  message: { color: AppColors.success, fontSize: 15, fontWeight: '600', textAlign: 'center' },
});
