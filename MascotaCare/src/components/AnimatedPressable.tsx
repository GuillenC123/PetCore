import { useEffect, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, type PressableProps } from 'react-native';
import { useReducedMotion } from '@/context/MotionContext';

const NativeAnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Respuesta táctil breve, sin retrasar la acción ni alterar el tamaño del layout. */
export default function AnimatedPressable({ style, onPressIn, onPressOut, onHoverIn, onHoverOut, disabled, ...props }: PressableProps) {
  const reducedMotion = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    if (reducedMotion || disabled) { scale.stopAnimation(); scale.setValue(1); }
    return () => scale.stopAnimation();
  }, [reducedMotion, disabled, scale]);

  const animate = (toValue: number) => {
    scale.stopAnimation();
    if (reducedMotion) { scale.setValue(1); return; }
    Animated.spring(scale, { toValue, stiffness: 500, damping: 30, mass: 0.7,
      overshootClamping: true, isInteraction: false, useNativeDriver: Platform.OS !== 'web' }).start();
  };
  const resolvedStyle = typeof style === 'function' ? style({ pressed, hovered }) : style;
  const transform = StyleSheet.flatten(resolvedStyle)?.transform;

  return <NativeAnimatedPressable {...props} disabled={disabled}
    onHoverIn={(event) => { setHovered(true); onHoverIn?.(event); }}
    onHoverOut={(event) => { setHovered(false); onHoverOut?.(event); }}
    onPressIn={(event) => { setPressed(true); animate(0.97); onPressIn?.(event); }}
    onPressOut={(event) => { setPressed(false); animate(1); onPressOut?.(event); }}
    style={[resolvedStyle, { transform: [...(Array.isArray(transform) ? transform : []), { scale }] }]} />;
}
