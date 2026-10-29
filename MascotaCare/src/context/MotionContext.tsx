import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';

const MotionContext = createContext(true);

/** Una sola suscripción para respetar Reducir movimiento en Android, iOS y web. */
export function MotionProvider({ children }: { children: ReactNode }) {
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    let active = true;
    let changed = false;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduced) => {
      changed = true;
      if (active) setReducedMotion(reduced);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (active && !changed) setReducedMotion(reduced);
    }).catch(() => { /* Si no se puede consultar, se conserva el modo sin movimiento. */ });
    return () => { active = false; subscription.remove(); };
  }, []);
  return <MotionContext.Provider value={reducedMotion}>{children}</MotionContext.Provider>;
}

export const useReducedMotion = () => useContext(MotionContext);
