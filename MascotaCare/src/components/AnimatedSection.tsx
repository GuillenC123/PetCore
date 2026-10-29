import { useCallback, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useReducedMotion } from '@/context/MotionContext';

/** Repite la entrada al volver a la pestaña; no reinicia formularios ni listas. */
export default function AnimatedSection({ children, delay = 0, replayKey, style }: {
  children: ReactNode;
  delay?: number;
  replayKey?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const reducedMotion = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(1));
  useFocusEffect(useCallback(() => {
    progress.stopAnimation();
    if (reducedMotion) { progress.setValue(1); return; }
    progress.setValue(0);
    const animation = Animated.sequence([
      // Los cambios de filtro responden antes, incluso en listas largas.
      Animated.delay(replayKey === undefined ? delay : Math.min(delay, 220)),
      Animated.timing(progress, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic),
        isInteraction: false, useNativeDriver: Platform.OS !== 'web' }),
    ]);
    animation.start();
    return () => { animation.stop(); progress.setValue(1); };
  }, [progress, reducedMotion, delay, replayKey]));

  return <Animated.View style={[style, { opacity: progress,
    transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }]}>
    {children}
  </Animated.View>;
}
