import { useCallback, useEffect, useRef, useState } from 'react';

import { apiGetDatos } from '@/services/api';
import type { DatosApp, EstadoCargaDatos } from '@/types';

interface SesionCarga {
  token: string;
  controller?: AbortController;
  pendiente?: Promise<void>;
}

const ESTADO_INICIAL: EstadoCargaDatos = {
  estado: 'inicial', error: null, datosDisponibles: false,
};

/** Una consulta por sesión: entrega las tres listas juntas o conserva las anteriores. */
export function useCargaDatos(aplicarDatos: (datos: DatosApp) => void) {
  const [estadoDatos, setEstadoDatos] = useState<EstadoCargaDatos>(ESTADO_INICIAL);
  const sesionActual = useRef<SesionCarga | null>(null);

  const cancelar = useCallback(() => {
    sesionActual.current?.controller?.abort();
    sesionActual.current = null;
  }, []);

  // También invalida las respuestas si el proveedor sale del árbol.
  useEffect(() => cancelar, [cancelar]);

  const cargarDatos = useCallback((): Promise<void> => {
    const sesion = sesionActual.current;
    if (!sesion) return Promise.resolve();
    if (sesion.pendiente) return sesion.pendiente;

    const controller = new AbortController();
    sesion.controller = controller;
    setEstadoDatos((anterior) => ({ ...anterior, estado: 'cargando', error: null }));

    // Se registra la promesa antes de ejecutar el servicio, incluso si este falla inmediatamente.
    sesion.pendiente = Promise.resolve().then(async () => {
      try {
        const datos = await apiGetDatos(sesion.token, controller.signal);
        if (sesionActual.current !== sesion || controller.signal.aborted) return;
        aplicarDatos(datos);
        setEstadoDatos({ estado: 'listo', error: null, datosDisponibles: true });
      } catch (error) {
        if (sesionActual.current !== sesion || controller.signal.aborted) return;
        controller.abort(); // Detiene las consultas hermanas que aún no hayan terminado.
        const mensaje = error instanceof Error ? error.message : 'No se pudieron cargar tus datos.';
        setEstadoDatos((anterior) => ({ ...anterior, estado: 'error', error: mensaje }));
      } finally {
        if (sesionActual.current === sesion) {
          sesion.pendiente = undefined;
          sesion.controller = undefined;
        }
      }
    });
    return sesion.pendiente;
  }, [aplicarDatos]);

  const iniciarCarga = useCallback((token: string, datosDemo?: DatosApp): Promise<void> => {
    cancelar();
    setEstadoDatos(ESTADO_INICIAL);
    if (datosDemo) {
      aplicarDatos(datosDemo);
      setEstadoDatos({ estado: 'listo', error: null, datosDisponibles: true });
      return Promise.resolve();
    }
    sesionActual.current = { token };
    return cargarDatos();
  }, [aplicarDatos, cancelar, cargarDatos]);

  const reiniciarCarga = useCallback(() => {
    cancelar();
    setEstadoDatos(ESTADO_INICIAL);
  }, [cancelar]);

  return { estadoDatos, cargarDatos, iniciarCarga, reiniciarCarga };
}
