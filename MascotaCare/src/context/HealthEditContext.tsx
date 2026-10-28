import { useAppColors } from '@/context/AppearanceContext';
import type { AppPalette } from '@/constants/theme';
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePreventRemove } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface Formulario { sucio: boolean; ocupado: boolean }
interface EdicionSalud {
  actualizar: (id: string, estado?: Formulario) => void;
  confirmar: (accion: () => void) => void;
  navegar: (accion: () => void) => void;
  ocupado: boolean;
}
const HealthEditContext = createContext<EdicionSalud | null>(null);

/** Una sola confirmación para volver, cambiar de sección o cancelar un formulario. */
export function HealthEditProvider({ children }: { children: ReactNode }) {
  const AppColors = useAppColors();
  const styles = createStyles(AppColors);

  const [formularios, setFormularios] = useState<Record<string, Formulario>>({});
  const [visible, setVisible] = useState(false);
  const [permitirSalida, setPermitirSalida] = useState(false);
  const pendiente = useRef<(() => void) | null>(null);
  const ocupado = Object.values(formularios).some((f) => f.ocupado);
  const sucio = Object.values(formularios).some((f) => f.sucio);
  const actualizar = useCallback((id: string, estado?: Formulario) => {
    setFormularios((anteriores) => {
      if (estado && anteriores[id]?.sucio === estado.sucio && anteriores[id]?.ocupado === estado.ocupado) return anteriores;
      if (!estado && !anteriores[id]) return anteriores;
      const siguientes = { ...anteriores };
      if (estado) siguientes[id] = estado;
      else delete siguientes[id];
      return siguientes;
    });
  }, []);
  const confirmar = useCallback((accion: () => void) => { pendiente.current = accion; setVisible(true); }, []);
  const desbloquear = usePreventRemove(!permitirSalida && (sucio || ocupado), ({ repeat }) => {
    if (ocupado) return;
    confirmar(() => { setPermitirSalida(true); repeat(); });
  });
  const navegar = useCallback((accion: () => void) => {
    if (ocupado) return;
    if (sucio) confirmar(() => { setPermitirSalida(true); desbloquear(); accion(); });
    else accion();
  }, [ocupado, sucio, confirmar, desbloquear]);
  const contexto = useMemo(() => ({ actualizar, confirmar, navegar, ocupado }), [actualizar, confirmar, navegar, ocupado]);
  const continuar = () => { pendiente.current = null; setVisible(false); };
  const descartar = () => {
    const accion = pendiente.current;
    pendiente.current = null; setVisible(false); accion?.();
  };
  return <HealthEditContext.Provider value={contexto}>
    {children}
    <Modal visible={visible} transparent animationType="fade" onRequestClose={continuar}>
      <View style={styles.overlay}><View style={styles.dialog} accessibilityViewIsModal>
        <Text accessibilityRole="header" style={styles.title}>Tienes cambios sin guardar</Text>
        <Text style={styles.description}>Puedes seguir editando o descartar los cambios de este formulario.</Text>
        <Pressable accessibilityRole="button" onPress={continuar} style={styles.primary}><Text style={styles.primaryText}>Seguir editando</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={descartar} style={styles.secondary}><Text style={styles.secondaryText}>Descartar cambios</Text></Pressable>
      </View></View>
    </Modal>
  </HealthEditContext.Provider>;
}

/** Los módulos conservan su uso fuera de las pantallas de salud. */
export function useFormularioSalud(sucio: boolean, ocupado = false) {
  const contexto = useContext(HealthEditContext);
  const id = useId();
  const actualizar = contexto?.actualizar;
  useEffect(() => { actualizar?.(id, { sucio, ocupado }); }, [actualizar, id, sucio, ocupado]);
  useEffect(() => () => actualizar?.(id), [actualizar, id]);
  const descartar = (accion: () => void) => {
    if (ocupado) return;
    if (sucio && contexto) contexto.confirmar(accion);
    else accion();
  };
  return { descartar };
}

export function useNavegacionSalud() {
  const contexto = useContext(HealthEditContext);
  if (!contexto) throw new Error('La navegación de salud requiere HealthEditProvider.');
  return { navegar: contexto.navegar, ocupado: contexto.ocupado };
}

const createStyles = (AppColors: AppPalette) => (StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#0008' },
  dialog: { width: '100%', maxWidth: 420, padding: 24, borderRadius: 20, backgroundColor: AppColors.surface, gap: 16 },
  title: { color: AppColors.text, fontSize: 20, fontWeight: '700' }, description: { color: AppColors.textSecondary, fontSize: 15, lineHeight: 23 },
  primary: { minHeight: 48, padding: 14, borderRadius: 12, backgroundColor: AppColors.primaryDark, alignItems: 'center' }, primaryText: { color: AppColors.onPrimary, fontWeight: '700', fontSize: 15 },
  secondary: { minHeight: 48, padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: AppColors.dangerSoft }, secondaryText: { color: AppColors.danger, fontWeight: '600', fontSize: 15 },
}));
