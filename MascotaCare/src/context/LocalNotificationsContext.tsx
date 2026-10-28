import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import type { NotificationResponse } from 'expo-notifications';
import { useAuth } from './AuthContext';
import { consultarPermiso, solicitarPermiso, type EstadoPermiso } from '@/services/permisos';
import { sincronizarAvisosDispositivo } from '@/services/avisos-dispositivo';
import { crearAgenda } from '@/utils/agenda';
import { crearAvisosLocales, identificadorAviso, leerDestinoAviso, propietarioAvisos } from '@/utils/avisos-locales';

const Context = createContext({ habilitado: false, listo: false, ocupado: false, cantidad: 0,
  permiso: 'pendiente' as EstadoPermiso, error: '', cambiar: async (_valor: boolean) => {}, actualizar: async () => {}, prueba: async () => {} });

export function LocalNotificationsProvider({ children }: { children: ReactNode }) {
  const { usuario, modoDemo, mascotas, citas, tratamientos, recordatorios, estadoDatos } = useAuth();
  const owner = usuario ? propietarioAvisos(usuario.id, modoDemo) : null;
  const [preferencia, setPreferencia] = useState<{ owner: string; habilitado: boolean } | null>(null);
  const [permiso, setPermiso] = useState<EstadoPermiso>('pendiente');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [syncError, setSyncError] = useState('');
  const [permissionError, setPermissionError] = useState('');
  const [recepcionError, setRecepcionError] = useState('');
  const [cantidad, setCantidad] = useState(0);
  const [revision, setRevision] = useState(0);
  const [respuesta, setRespuesta] = useState<NotificationResponse | null>(null);
  const actual = useRef(owner);
  const bloqueo = useRef(false);
  const consumidas = useRef(new Set<string>());
  const listo = owner !== null && preferencia?.owner === owner;
  const habilitado = listo && preferencia.habilitado;
  useEffect(() => { actual.current = owner; }, [owner]);

  const actualizar = useCallback(async () => {
    const sesion = owner;
    try {
      const estado = await consultarPermiso('notificaciones');
      if (actual.current === sesion) { setPermiso(estado); setPermissionError(''); setRevision((prev) => prev + 1); }
    } catch { if (actual.current === sesion) setPermissionError('No se pudo consultar el permiso de notificaciones. Inténtalo nuevamente.'); }
  }, [owner]);

  useEffect(() => {
    if (!owner) return;
    let vigente = true;
    AsyncStorage.getItem(`petcore.avisos:${owner}`).then((guardado) => {
      if (!vigente) return;
      setPreferencia({ owner, habilitado: guardado === 'true' }); setError('');
    }).catch(() => {
      if (vigente) { setPreferencia({ owner, habilitado: false }); setError('No se pudo recuperar la configuración de avisos. Vuelve a activar los avisos para guardarla.'); }
    });
    return () => { vigente = false; };
  }, [owner]);

  useEffect(() => {
    void Promise.resolve().then(actualizar);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') void actualizar(); });
    const timer = setInterval(() => { if (AppState.currentState === 'active') void actualizar(); }, 60_000);
    return () => { subscription.remove(); clearInterval(timer); };
  }, [actualizar]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let vigente = true;
    // null conserva avisos de esta cuenta mientras se recupera la información.
    const avisos = owner && (!listo || (habilitado && permiso === 'permitido' && !estadoDatos.datosDisponibles)) ? null
      : owner && habilitado && permiso === 'permitido' ? crearAvisosLocales(owner, mascotas, citas, tratamientos, recordatorios) : [];
    sincronizarAvisosDispositivo(owner, avisos, new Set(owner && habilitado && permiso === 'permitido'
      ? crearAgenda(citas, tratamientos, recordatorios).map((evento) => identificadorAviso(owner, evento.clave)) : []), habilitado && permiso === 'permitido').then((total) => {
      if (vigente) { setCantidad(total); setSyncError(''); }
    }).catch(() => {
      console.warn('[PetCore][avisos] Falló la sincronización de avisos locales.');
      if (vigente) setSyncError('No se pudieron actualizar los avisos del teléfono. Tus cuidados siguen guardados. Pulsa Reintentar.');
    });
    return () => { vigente = false; };
  }, [owner, listo, habilitado, permiso, mascotas, citas, tratamientos, recordatorios, estadoDatos.datosDisponibles, revision]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let vigente = true;
    let subscription: { remove: () => void } | undefined;
    import('@/services/notificaciones-locales-api').then(async (n) => {
      if (!vigente) return;
      n.setNotificationHandler({ handleNotification: async (notification) => {
        const mostrar = notification.request.content.data?.petcore === true && notification.request.content.data?.owner === actual.current;
        return { shouldShowBanner: mostrar, shouldShowList: mostrar, shouldPlaySound: mostrar, shouldSetBadge: false };
      } });
      subscription = n.addNotificationResponseReceivedListener((response) => { if (vigente) setRespuesta(response); });
      const last = await n.getLastNotificationResponseAsync();
      if (vigente) { setRecepcionError(''); if (last) setRespuesta(last); }
    }).catch(() => { if (vigente) setRecepcionError('No se pudo iniciar la recepción de avisos. Reabre la app para reintentar.'); });
    return () => { vigente = false; subscription?.remove(); };
  }, [revision]);

  useEffect(() => {
    if (!respuesta || !owner || !estadoDatos.datosDisponibles) return;
    const request = respuesta.notification.request;
    const id = `${request.identifier}:${respuesta.notification.date}:${request.content.data?.firma}`;
    if (consumidas.current.has(id)) return;
    consumidas.current.add(id);
    if (consumidas.current.size > 100) consumidas.current.delete(consumidas.current.values().next().value!);
    const clave = leerDestinoAviso(respuesta.notification.request.content.data ?? {}, owner);
    if (clave) router.push({ pathname: '/cuidado', params: { clave, owner } });
    void import('@/services/notificaciones-locales-api').then((n) => n.clearLastNotificationResponseAsync()).catch(() => {});
  }, [respuesta, owner, estadoDatos.datosDisponibles]);

  const cambiar = async (valor: boolean) => {
    if (!owner || bloqueo.current || Platform.OS === 'web') return;
    bloqueo.current = true; setOcupado(true); setError('');
    const sesion = owner;
    try {
      if (valor) {
        const estado = await solicitarPermiso('notificaciones');
        if (actual.current !== sesion) return;
        setPermiso(estado);
        if (estado !== 'permitido') { setError('No se permitieron las notificaciones. Puedes seguir usando la agenda y activar el permiso desde Perfil o Ajustes.'); return; }
      }
      await AsyncStorage.setItem(`petcore.avisos:${sesion}`, String(valor));
      if (actual.current === sesion) { setPreferencia({ owner: sesion, habilitado: valor }); setRevision((prev) => prev + 1); }
    } catch { if (actual.current === sesion) setError('No se pudo guardar la configuración de avisos. Vuelve a intentarlo.'); }
    finally { bloqueo.current = false; setOcupado(false); }
  };
  const prueba = async () => {
    if (!owner || !habilitado || permiso !== 'permitido' || Platform.OS === 'web' || bloqueo.current) return;
    bloqueo.current = true; setOcupado(true); setError('');
    const sesion = owner;
    try {
      const n = await import('@/services/notificaciones-locales-api');
      const { prepararCanal, CANAL_CUIDADOS } = await import('@/services/permisos');
      await prepararCanal();
      if (actual.current !== sesion) return;
      const identifier = `petcore:prueba:${sesion}`;
      await n.scheduleNotificationAsync({ identifier, content: { title: 'PetCore', body: 'Los avisos locales están funcionando.', sound: 'default',
        data: { petcore: true, version: 1, owner: sesion, clave: 'prueba', firma: 'prueba', pruebaHasta: Date.now() + 15_000 } },
        trigger: { type: n.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: CANAL_CUIDADOS } });
      if (actual.current !== sesion) await n.cancelScheduledNotificationAsync(identifier);
    } catch { if (actual.current === sesion) setError('No se pudo programar el aviso de prueba. Revisa el permiso y vuelve a intentar.'); }
    finally { bloqueo.current = false; setOcupado(false); }
  };
  const value = { habilitado, listo, ocupado, cantidad, permiso, error: error || permissionError || recepcionError || syncError, cambiar, actualizar, prueba };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export const useLocalNotifications = () => useContext(Context);
