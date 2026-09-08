import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** Actualiza los vencimientos mientras la pantalla está abierta y al regresar. */
export function useAhora() {
  const [ahora, setAhora] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setAhora(Date.now()), 1000);
    const listener = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') setAhora(Date.now());
    });
    return () => { clearInterval(timer); listener.remove(); };
  }, []);
  return ahora;
}
