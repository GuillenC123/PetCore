import { useRef, useState } from 'react';

export function useAccionGuardado() {
  const bloqueo = useRef(false);
  const intento = useRef<(() => void | Promise<void>) | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const ejecutar = async (accion: () => void | Promise<void>) => {
    if (bloqueo.current) return;
    bloqueo.current = true; setGuardando(true); setError(''); setMensaje(''); intento.current = accion;
    try { await accion(); setMensaje('Cambio guardado.'); intento.current = null; }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar el cambio.'); }
    finally { bloqueo.current = false; setGuardando(false); }
  };
  return { guardando, error, mensaje, ejecutar, reintentar: () => { if (intento.current) void ejecutar(intento.current); } };
}
