import { useCallback, useEffect, useState } from 'react';
import { apiGetRazas } from '@/services/api';
import type { CatalogoRazas } from '@/types';

interface Estado {
  especie: string;
  estado: 'cargando' | 'listo' | 'error';
  datos?: CatalogoRazas;
}

export function useRazas(especie: string) {
  const [resultado, setResultado] = useState<Estado>({ especie: '', estado: 'cargando' });
  const [intento, setIntento] = useState(0);
  const admitida = especie === 'Perro' || especie === 'Gato';
  useEffect(() => {
    if (especie !== 'Perro' && especie !== 'Gato') return;
    const controller = new AbortController();
    void apiGetRazas(especie, controller.signal).then((datos) => {
      if (!controller.signal.aborted) setResultado({ especie, estado: 'listo', datos });
    }).catch(() => {
      if (!controller.signal.aborted) setResultado({ especie, estado: 'error' });
    });
    return () => controller.abort();
  }, [especie, intento]);
  const reintentar = useCallback(() => {
    setResultado({ especie, estado: 'cargando' });
    setIntento((actual) => actual + 1);
  }, [especie]);
  const vigente = resultado.especie === especie;
  return {
    cargando: admitida && (!vigente || resultado.estado === 'cargando'),
    error: admitida && vigente && resultado.estado === 'error',
    catalogo: vigente ? resultado.datos : undefined,
    reintentar,
  };
}
