import { useLocalNotifications } from '@/context/LocalNotificationsContext';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, Pressable, Text, View } from 'react-native';
import { useAppColors } from '@/context/AppearanceContext';
import { abrirAjustesPermisos, consultarPermiso, solicitarPermiso, type EstadoPermiso, type TipoPermiso } from '@/services/permisos';

const LABELS: Record<EstadoPermiso, string> = { permitido: 'Permitido', pendiente: 'Sin solicitar', denegado: 'No permitido', bloqueado: 'Bloqueado en Ajustes', no_disponible: 'Disponible en la app móvil' };
const OPTIONS: { tipo: TipoPermiso; titulo: string; descripcion: string }[] = [
  { tipo: 'camara', titulo: 'Cámara', descripcion: 'Para tomar fotos de tus mascotas, tu perfil y comprobantes.' },
  { tipo: 'notificaciones', titulo: 'Notificaciones del teléfono', descripcion: 'Para recibir avisos de citas, medicamentos y recordatorios.' },
];

export default function PermissionsPanel() {
  const colors = useAppColors();
  const avisos = useLocalNotifications();
  const [estados, setEstados] = useState<Partial<Record<TipoPermiso, EstadoPermiso>>>({});
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const montado = useRef(true);
  const bloqueo = useRef(false);
  const actualizar = useCallback(async () => {
    try {
      const resultados = await Promise.allSettled([consultarPermiso('camara'), consultarPermiso('notificaciones')]);
      if (montado.current) {
        const tipos: TipoPermiso[] = ['camara', 'notificaciones'];
        setEstados((prev) => {
          const siguientes = { ...prev };
          resultados.forEach((resultado, i) => { if (resultado.status === 'fulfilled') siguientes[tipos[i]] = resultado.value; });
          return siguientes;
        });
        setError(resultados.some((resultado) => resultado.status === 'rejected') ? 'No se pudo consultar uno de los permisos. Los demás siguen disponibles. Pulsa Reintentar.' : '');
      }
    } catch { if (montado.current) setError('No se pudo consultar los permisos. Vuelve a intentarlo.'); }
  }, []);
  useEffect(() => {
    montado.current = true;
    void Promise.resolve().then(actualizar);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') void actualizar(); });
    return () => { montado.current = false; subscription.remove(); };
  }, [actualizar]);
  const permitir = async (tipo: TipoPermiso) => {
    if (bloqueo.current) return;
    bloqueo.current = true; setOcupado(true); setError('');
    try {
      if (estados[tipo] === 'bloqueado' || estados[tipo] === 'permitido') await abrirAjustesPermisos();
      else {
        const estado = await solicitarPermiso(tipo);
        if (montado.current) setEstados((prev) => ({ ...prev, [tipo]: estado }));
        if (tipo === 'notificaciones') await avisos.actualizar();
      }
    } catch (causa) { if (montado.current) setError(causa instanceof Error && causa.name === 'PermisoNotificacionesError' ? causa.message : 'No se pudo abrir el permiso. Intenta nuevamente desde Ajustes del dispositivo.'); }
    finally { bloqueo.current = false; if (montado.current) setOcupado(false); }
  };
  return <View style={{ padding: 18, borderRadius: 16, gap: 14, backgroundColor: colors.surface }}>
    <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>Permisos del dispositivo</Text>
    {Platform.OS === 'web' ? <Text style={{ color: colors.textSecondary, lineHeight: 21 }}>La cámara y los avisos locales se configuran en la app de Android o iOS. Aquí puedes seguir usando la galería y la agenda.</Text> : OPTIONS.map(({ tipo, titulo, descripcion }) => <View key={tipo} style={{ gap: 8 }}>
      <Text style={{ color: colors.text, fontWeight: '700' }}>{titulo}</Text>
      <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>{descripcion}</Text>
      <Text accessibilityLiveRegion="polite" style={{ color: colors.accent }}>{estados[tipo] ? LABELS[estados[tipo]] : 'Consultando…'}</Text>
      <Pressable accessibilityRole="button" disabled={ocupado || !estados[tipo]} onPress={() => void permitir(tipo)}
        style={{ padding: 12, minHeight: 44, borderRadius: 10, backgroundColor: colors.infoSoft, opacity: ocupado ? 0.5 : 1 }}>
        <Text style={{ color: colors.accent, fontWeight: '600' }}>{estados[tipo] === 'bloqueado' || estados[tipo] === 'permitido' ? `Abrir Ajustes de ${titulo.toLowerCase()}` : `Permitir ${titulo.toLowerCase()}`}</Text>
      </Pressable>
      {estados[tipo] === 'denegado' && <Pressable accessibilityRole="button" disabled={ocupado} onPress={() => void abrirAjustesPermisos().catch(() => setError('Abre los permisos de la aplicación desde Ajustes del dispositivo.'))}
        style={{ minHeight: 44, padding: 12 }}><Text style={{ color: colors.accent }}>Abrir Ajustes de {titulo.toLowerCase()}</Text></Pressable>}
    </View>)}
    {!!error && <><Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void actualizar()} style={{ minHeight: 44, padding: 12 }}><Text style={{ color: colors.accent }}>Reintentar consulta de permisos</Text></Pressable></>}
  </View>;
}
