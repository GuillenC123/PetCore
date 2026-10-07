import { useCallback, useEffect, useRef, useState } from 'react';

import { apiGetDatos } from '@/services/api';
import { guardarCache, leerCache } from '@/services/storage';
import type { DatosApp, DestinoCache, EstadoCargaDatos, Identificador, Recordatorio } from '@/types';

interface SesionCarga {
  token: string;
  destino: DestinoCache;
  demo?: DatosApp;
  recuperada: boolean;
  datos: DatosApp | null;
  controller?: AbortController;
  pendiente?: Promise<void>;
  revision: number;
  confirmaciones: Map<string, { revision: number; dato: Recordatorio }>;
  versionGuardado: number;
  guardadosPendientes: number;
}

const ESTADO_INICIAL: EstadoCargaDatos = {
  estado: 'inicial', error: null, datosDisponibles: false,
  procedencia: null, actualizadoEn: null, guardandoCache: false, errorCache: null,
};

/** Recuperación, consulta y persistencia usan la misma sesión y una sola instantánea remota. */
export function useCargaDatos(aplicarDatos: (datos: DatosApp) => void) {
  const [estadoDatos, setEstadoDatos] = useState<EstadoCargaDatos>(ESTADO_INICIAL);
  const [sesion, setSesion] = useState<SesionCarga | null>(null);
  const actual = useRef<SesionCarga | null>(null);

  const cancelar = useCallback((anterior: SesionCarga | null) => {
    anterior?.controller?.abort();
    if (actual.current === anterior) actual.current = null;
  }, []);

  const guardarInstantanea = useCallback(async (s: SesionCarga) => {
    if (actual.current !== s || !s.datos) return;
    const version = ++s.versionGuardado;
    s.guardadosPendientes++;
    setEstadoDatos((prev) => ({ ...prev, guardandoCache: true }));
    try {
      await guardarCache(s.destino, s.datos);
      if (actual.current === s && version === s.versionGuardado) {
        setEstadoDatos((prev) => ({ ...prev, errorCache: null }));
      }
    } catch {
      if (actual.current === s && version === s.versionGuardado) {
        setEstadoDatos((prev) => ({ ...prev, errorCache: 'No se pudo guardar una copia en este dispositivo.' }));
      }
    } finally {
      s.guardadosPendientes--;
      if (actual.current === s) setEstadoDatos((prev) => ({ ...prev, guardandoCache: s.guardadosPendientes > 0 }));
    }
  }, []);

  const ejecutar = useCallback((s: SesionCarga): Promise<void> => {
    if (actual.current !== s) return Promise.resolve();
    if (s.pendiente) return s.pendiente;
    s.pendiente = Promise.resolve().then(async () => {
      const vigente = () => actual.current === s;
      try {
        if (!s.recuperada) {
          try {
            const lectura = await leerCache(s.destino);
            if (!vigente()) return;
            s.recuperada = true;
            if (lectura.estado === 'disponible') {
              s.datos = lectura.cache.datos;
              aplicarDatos(s.datos);
              // Una copia vacía no muestra vacío hasta que termine la consulta inicial.
              const tieneFilas = Object.values(s.datos).some((lista) => lista.length > 0);
              setEstadoDatos((prev) => ({
                ...prev, datosDisponibles: tieneFilas, procedencia: 'cache',
                actualizadoEn: lectura.cache.actualizadoEn,
              }));
            } else if (lectura.estado !== 'ausente') {
              setEstadoDatos((prev) => ({ ...prev, errorCache: 'No se pudo recuperar la copia guardada. Intentaremos actualizar tus datos.' }));
            }
          } catch {
            if (!vigente()) return;
            s.recuperada = true;
            setEstadoDatos((prev) => ({ ...prev, errorCache: 'No se pudo leer la copia de este dispositivo.' }));
          }
        }
        if (!vigente()) return;
        setEstadoDatos((prev) => ({ ...prev, estado: 'cargando', error: null }));
        const revisionInicio = s.revision;
        s.controller = new AbortController();
        const recibidos = s.demo ?? await apiGetDatos(s.token, s.controller.signal);
        if (!vigente() || s.controller.signal.aborted) return;
        // Un GET iniciado antes de un PUT confirmado no debe deshacerlo.
        const recientes = [...s.confirmaciones.values()].filter((c) => c.revision > revisionInicio);
        const porId = new Map(recientes.map((c) => [String(c.dato.id), c.dato]));
        s.datos = {
          ...recibidos,
          recordatorios: recibidos.recordatorios.map((r) => ({ ...r, ...porId.get(String(r.id)) })),
        };
        for (const [id, confirmacion] of s.confirmaciones) {
          if (confirmacion.revision <= revisionInicio) s.confirmaciones.delete(id);
        }
        aplicarDatos(s.datos);
        setEstadoDatos((prev) => ({
          ...prev, estado: 'listo', error: null, datosDisponibles: true,
          procedencia: s.demo ? 'demo' : 'api', actualizadoEn: new Date().toISOString(),
        }));
        await guardarInstantanea(s);
      } catch (error) {
        if (!vigente()) return;
        s.controller?.abort();
        setEstadoDatos((prev) => ({
          ...prev, estado: 'error', datosDisponibles: s.datos !== null,
          error: error instanceof Error ? error.message : 'No se pudieron actualizar tus datos.',
        }));
      } finally {
        if (vigente()) { s.pendiente = undefined; s.controller = undefined; }
      }
    });
    return s.pendiente;
  }, [aplicarDatos, guardarInstantanea]);

  // La recuperación arranca después de que React publique la nueva sesión.
  useEffect(() => {
    if (!sesion) return;
    void ejecutar(sesion);
    return () => cancelar(sesion);
  }, [sesion, ejecutar, cancelar]);

  const iniciarCarga = useCallback((token: string, usuarioId: Identificador, demo?: DatosApp) => {
    cancelar(actual.current);
    const nueva: SesionCarga = {
      token, destino: { usuarioId, origen: demo ? 'demo' : 'api' }, demo,
      recuperada: false, datos: null, revision: 0, confirmaciones: new Map(),
      versionGuardado: 0, guardadosPendientes: 0,
    };
    actual.current = nueva;
    setEstadoDatos({ ...ESTADO_INICIAL, estado: 'recuperando' });
    setSesion(nueva);
  }, [cancelar]);

  const cargarDatos = useCallback(() => actual.current ? ejecutar(actual.current) : Promise.resolve(), [ejecutar]);
  const reintentarGuardado = useCallback(() => actual.current ? guardarInstantanea(actual.current) : Promise.resolve(), [guardarInstantanea]);

  const confirmarRecordatorio = useCallback(async (dato: Recordatorio) => {
    const s = actual.current;
    if (!s || s.demo || !s.datos || !s.datos.recordatorios.some((r) => r.id === dato.id)) return;
    s.confirmaciones.set(String(dato.id), { revision: ++s.revision, dato });
    s.datos = { ...s.datos, recordatorios: s.datos.recordatorios.map((r) => r.id === dato.id ? { ...r, ...dato } : r) };
    await guardarInstantanea(s);
  }, [guardarInstantanea]);

  const reiniciarCarga = useCallback(() => {
    cancelar(actual.current);
    setSesion(null);
    setEstadoDatos(ESTADO_INICIAL);
  }, [cancelar]);

  return { estadoDatos, iniciarCarga, cargarDatos, reiniciarCarga, reintentarGuardado, confirmarRecordatorio };
}
